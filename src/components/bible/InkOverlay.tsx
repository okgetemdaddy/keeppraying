import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { usePaperCamera } from "@/components/bible/PaperCanvasContext";
import { usePencilTools, getActiveFilterId, getBrushStrokeOptions } from "@/hooks/usePencilTools";
import InkFilterDefs from "@/components/bible/toolbar/InkFilterDefs";

import { getStroke } from "perfect-freehand";
import simplify from "simplify-js";
import type { Point } from "./HandwritingEngine";
import { isClosedLoop, convexHull, pointInPolygon, findVersesInsideStroke } from "@/lib/convexHull";

/* ── SVG path helper ── */
function getSvgPathFromStroke(stroke: number[][], closed = true): string {
  const len = stroke.length;
  if (len < 4) return "";
  const avg = (a: number, b: number) => (a + b) / 2;
  let d = "";
  let a = stroke[0];
  let b = stroke[1];
  const c = stroke[2];
  d += `M ${a[0].toFixed(2)},${a[1].toFixed(2)} Q ${b[0].toFixed(2)},${b[1].toFixed(2)} ${avg(b[0], c[0]).toFixed(2)},${avg(b[1], c[1]).toFixed(2)} T`;
  for (let i = 2; i < len - 1; i++) {
    a = stroke[i];
    b = stroke[i + 1];
    d += `${avg(a[0], b[0]).toFixed(2)},${avg(a[1], b[1]).toFixed(2)} `;
  }
  if (closed) d += "Z";
  return d;
}

export interface InkStroke {
  id: string;
  points: Point[];
  color: string;
  size: number;
  linkedVerse: number | null;
  glow?: string | null;
}

interface InkOverlayProps {
  zoom: number;
  strokes: InkStroke[];
  onStrokeComplete: (stroke: InkStroke) => void;
  onUndo: () => void;
  penColor?: string;
  penSize?: number;
  penGlow?: string | null;
  fingerDrawing?: boolean;
  isDark?: boolean;
  canvasWidth?: number;
  canvasHeight?: number;
  onCircleSelect?: (verseNumbers: number[], hullCenter?: { x: number; y: number }) => void;
  onPencilFirstContact?: () => void;
  onWordCircle?: (words: string, verseNumber: number, anchorPoint: { x: number; y: number }) => void;
  onUnderlineGesture?: (verseNumber: number, underlinedText: string) => void;
  onXGesture?: (bbox: { minX: number; minY: number; maxX: number; maxY: number }) => void;
}

// Default stroke options — used as fallback when store isn't providing brush-specific options
const STROKE_OPTIONS = {
  thinning: 0.5,
  smoothing: 0.5,
  streamline: 0.5,
  simulatePressure: false,
  start: { taper: 12, easing: (t: number) => t * t },
  end: { taper: 8, easing: (t: number) => t },
};

const SEPIA_COLOR = "#D4C4A8";
const TOUCH_LOCKOUT_MS = 500;

/* ── Underline gesture detection ── */
function isUnderlineGesture(points: Array<{ x: number; y: number }>): boolean {
  if (points.length < 5) return false;
  const minX = Math.min(...points.map((p) => p.x));
  const maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));
  const xRange = maxX - minX;
  const yRange = maxY - minY;
  if (xRange < 40) return false;
  if (yRange > xRange * 0.3) return false;
  return true;
}

/* ── X-gesture detection ── */
function isXGesture(
  points: Array<{ x: number; y: number }>,
): { detected: boolean; bbox: { minX: number; minY: number; maxX: number; maxY: number } } {
  const nope = { detected: false, bbox: { minX: 0, minY: 0, maxX: 0, maxY: 0 } };
  if (points.length < 8) return nope;

  const minX = Math.min(...points.map((p) => p.x));
  const maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));
  const xRange = maxX - minX;
  const yRange = maxY - minY;

  if (xRange < 20 || yRange < 20) return nope;
  if (xRange / yRange > 4 || yRange / xRange > 4) return nope;

  let bestReversal = -1;
  let bestIdx = Math.floor(points.length / 2);
  for (let i = 2; i < points.length - 2; i++) {
    const dx1 = points[i].x - points[i - 2].x;
    const dy1 = points[i].y - points[i - 2].y;
    const dx2 = points[i + 2].x - points[i].x;
    const dy2 = points[i + 2].y - points[i].y;
    const dot = dx1 * dx2 + dy1 * dy2;
    const mag = Math.sqrt((dx1 * dx1 + dy1 * dy1) * (dx2 * dx2 + dy2 * dy2)) || 1;
    const cosAngle = dot / mag;
    if (cosAngle < bestReversal || bestReversal === -1) {
      bestReversal = cosAngle;
      bestIdx = i;
    }
  }

  if (bestReversal > -0.15) return nope;

  const seg1 = points.slice(0, bestIdx + 1);
  const seg2 = points.slice(bestIdx);

  const seg1xRange = Math.max(...seg1.map((p) => p.x)) - Math.min(...seg1.map((p) => p.x));
  const seg1yRange = Math.max(...seg1.map((p) => p.y)) - Math.min(...seg1.map((p) => p.y));
  const seg2xRange = Math.max(...seg2.map((p) => p.x)) - Math.min(...seg2.map((p) => p.x));
  const seg2yRange = Math.max(...seg2.map((p) => p.y)) - Math.min(...seg2.map((p) => p.y));

  if (seg1xRange / xRange < 0.3 || seg1yRange / yRange < 0.3) return nope;
  if (seg2xRange / xRange < 0.3 || seg2yRange / yRange < 0.3) return nope;

  return { detected: true, bbox: { minX, minY, maxX, maxY } };
}

export function InkOverlay({
  zoom,
  strokes,
  onStrokeComplete,
  onUndo,
  penColor = "#1a1a1a",
  penSize = 8,
  penGlow,
  fingerDrawing = false,
  isDark = false,
  canvasWidth,
  canvasHeight,
  onCircleSelect,
  onPencilFirstContact,
  onWordCircle,
  onUnderlineGesture,
  onXGesture,
}: InkOverlayProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const cameraCtx = usePaperCamera();
  const livePathRef = useRef<SVGPathElement>(null);
  const [selectedStrokeId, setSelectedStrokeId] = useState<string | null>(null);
  const [xFlash, setXFlash] = useState<{ x: number; y: number } | null>(null);

  // ── Read from Zustand store (fallback to props for backward compat) ──
  const store = usePencilTools();
  const effectiveColor = store.color || penColor || "#1a1a1a";
  const effectiveSize = store.size || penSize || 8;
  const effectiveOpacity = store.opacity ?? 1;

  // ── RAF point buffer (NOT React state) ──
  const pointsBufferRef = useRef<Point[]>([]);
  const isDrawingRef = useRef(false);
  const rafIdRef = useRef<number>(0);

  // Hover preview state
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  // Palm rejection
  const lastPenDownRef = useRef<number>(0);
  const firstContactFiredRef = useRef(false);

  // Stable refs for current pen settings (reads from store)
  const penColorRef = useRef(effectiveColor);
  const penSizeRef = useRef(effectiveSize);
  const penGlowRef = useRef(penGlow);
  penColorRef.current = effectiveColor;
  penSizeRef.current = effectiveSize;
  penGlowRef.current = penGlow ?? null;

  /* ── Coordinate normalization via pure-math inverse transform ──
   * Bypasses Safari's buggy getScreenCTM().inverse() with nested 3D
   * rotations. Manually reverses the CSS transform chain:
   * translate3d(x,y,0) rotate(r) scale(s) */
  const getTransformedPoint = useCallback(
    (clientX: number, clientY: number): [number, number] => {
      if (!cameraCtx?.deskRef.current) {
        // Fallback for non-PaperCanvas usage (ZoomWrapper mode)
        const svg = svgRef.current;
        if (!svg) return [0, 0];
        const ctm = svg.getScreenCTM();
        if (ctm) {
          const pt = svg.createSVGPoint();
          pt.x = clientX;
          pt.y = clientY;
          const transformed = pt.matrixTransform(ctm.inverse());
          return [transformed.x, transformed.y];
        }
        const rect = svg.getBoundingClientRect();
        return [clientX - rect.left, clientY - rect.top];
      }

      const rect = cameraCtx.deskRef.current.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;

      // Map screen coords to wrapper-local, centered at origin
      let x = (clientX - rect.left) - cx;
      let y = (clientY - rect.top) - cy;

      // Reverse translate
      x -= cameraCtx.camera.current.x;
      y -= cameraCtx.camera.current.y;

      // Reverse scale
      x /= cameraCtx.camera.current.scale;
      y /= cameraCtx.camera.current.scale;

      // Reverse rotation
      const rad = -cameraCtx.camera.current.rotation * (Math.PI / 180);
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const rx = x * cos - y * sin;
      const ry = x * sin + y * cos;

      // Output is in centered coordinates matching the centered SVG viewBox
      return [rx, ry];
    },
    [cameraCtx],
  );

  /* ── RAF render loop ── */
  const renderLoop = useCallback(() => {
    if (!isDrawingRef.current) return;
    const points = pointsBufferRef.current;
    if (points.length >= 3 && livePathRef.current) {
      const outline = getStroke(
        points.map((p) => [p.x, p.y, p.pressure]),
        { ...STROKE_OPTIONS, size: penSizeRef.current },
      );
      const pathData = getSvgPathFromStroke(outline);
      if (pathData) {
        livePathRef.current.setAttribute("d", pathData);
        livePathRef.current.setAttribute("fill", penColorRef.current);
        const glow = penGlowRef.current;
        if (glow) {
          const filterId = `neon-${glow.replace("#", "")}`;
          livePathRef.current.setAttribute("filter", `url(#${filterId})`);
          livePathRef.current.style.mixBlendMode = "screen";
        } else {
          livePathRef.current.removeAttribute("filter");
          livePathRef.current.style.mixBlendMode = "";
        }
        livePathRef.current.style.display = "";
      }
    }
    rafIdRef.current = requestAnimationFrame(renderLoop);
  }, []);

  /* ── Finalize stroke (gesture detection + commit) ── */
  const finalizeStroke = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    cancelAnimationFrame(rafIdRef.current);

    if (livePathRef.current) {
      livePathRef.current.style.display = "none";
      livePathRef.current.removeAttribute("d");
    }

    const currentPoints = pointsBufferRef.current;
    if (currentPoints.length < 3) {
      pointsBufferRef.current = [];
      return;
    }

    /* ── Circle-to-Select with word-level detection ── */
    if (svgRef.current && isClosedLoop(currentPoints)) {
      const hull = convexHull(currentPoints);
      if (hull.length >= 3) {
        const svgRect = svgRef.current.getBoundingClientRect();

        const wordElements = document.querySelectorAll("[data-word]");
        const enclosedWords: Array<{ word: string; verse: number; element: Element }> = [];

        wordElements.forEach((el) => {
          const rect = el.getBoundingClientRect();
          const screenCTM = svgRef.current?.getScreenCTM();
          let center: { x: number; y: number };
          if (screenCTM) {
            const pt = svgRef.current!.createSVGPoint();
            pt.x = rect.left + rect.width / 2;
            pt.y = rect.top + rect.height / 2;
            const transformed = pt.matrixTransform(screenCTM.inverse());
            center = { x: transformed.x, y: transformed.y };
          } else {
            center = {
              x: rect.left + rect.width / 2 - svgRect.left,
              y: rect.top + rect.height / 2 - svgRect.top,
            };
          }
          if (pointInPolygon(center, hull)) {
            enclosedWords.push({
              word: el.getAttribute("data-word") || "",
              verse: parseInt(el.getAttribute("data-verse") || "0", 10),
              element: el,
            });
          }
        });

        if (enclosedWords.length > 0) {
          const uniqueVerses = [...new Set(enclosedWords.map((w) => w.verse))];

          if (enclosedWords.length <= 4 && uniqueVerses.length === 1 && onWordCircle) {
            const words = enclosedWords.map((w) => w.word).join(" ");
            const svgEl = svgRef.current!;
            const ctmW = svgEl.getScreenCTM();
            if (ctmW) {
              const xs = currentPoints.map((p) => p.x);
              const ys = currentPoints.map((p) => p.y);
              const avgSvgX = xs.reduce((a, b) => a + b, 0) / xs.length;
              const avgSvgY = ys.reduce((a, b) => a + b, 0) / ys.length;
              const pt = svgEl.createSVGPoint();
              pt.x = avgSvgX; pt.y = avgSvgY;
              const screen = pt.matrixTransform(ctmW);
              onWordCircle(words, uniqueVerses[0], { x: screen.x, y: screen.y });
            }
            pointsBufferRef.current = [];
            return;
          }

          if (onCircleSelect) {
            const svgEl = svgRef.current!;
            const ctmC = svgEl.getScreenCTM();
            if (ctmC) {
              const xs = currentPoints.map((p) => p.x);
              const ys = currentPoints.map((p) => p.y);
              const avgSvgX = xs.reduce((a, b) => a + b, 0) / xs.length;
              const avgSvgY = ys.reduce((a, b) => a + b, 0) / ys.length;
              const pt = svgEl.createSVGPoint();
              pt.x = avgSvgX; pt.y = avgSvgY;
              const screen = pt.matrixTransform(ctmC);
              onCircleSelect(uniqueVerses, { x: screen.x, y: screen.y });
            }
            pointsBufferRef.current = [];
            return;
          }
        }

        if (onCircleSelect) {
          const matched = findVersesInsideStroke(currentPoints, svgRef.current);
          if (matched.length > 0) {
            const svgEl = svgRef.current!;
            const ctmF = svgEl.getScreenCTM();
            if (ctmF) {
              const xs = currentPoints.map((p) => p.x);
              const ys = currentPoints.map((p) => p.y);
              const avgSvgX = xs.reduce((a, b) => a + b, 0) / xs.length;
              const avgSvgY = ys.reduce((a, b) => a + b, 0) / ys.length;
              const pt = svgEl.createSVGPoint();
              pt.x = avgSvgX; pt.y = avgSvgY;
              const screen = pt.matrixTransform(ctmF);
              onCircleSelect(matched, { x: screen.x, y: screen.y });
            }
            pointsBufferRef.current = [];
            return;
          }
        }
      }
    }

    /* ── X-gesture detection ── */
    if (onXGesture && !isClosedLoop(currentPoints)) {
      const xResult = isXGesture(currentPoints);
      if (xResult.detected) {
        const centerX = (xResult.bbox.minX + xResult.bbox.maxX) / 2;
        const centerY = (xResult.bbox.minY + xResult.bbox.maxY) / 2;
        setXFlash({ x: centerX, y: centerY });
        setTimeout(() => setXFlash(null), 400);
        if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
        onXGesture(xResult.bbox);
        pointsBufferRef.current = [];
        return;
      }
    }

    /* ── Underline gesture detection ── */
    if (onUnderlineGesture && isUnderlineGesture(currentPoints) && svgRef.current) {
      const svg = svgRef.current;
      const ctm = svg.getScreenCTM();

      if (ctm) {
        const screenPoints = currentPoints.map(p => {
          const pt = svg.createSVGPoint();
          pt.x = p.x;
          pt.y = p.y;
          const screen = pt.matrixTransform(ctm);
          return { x: screen.x, y: screen.y };
        });

        const startX = Math.min(...screenPoints.map(p => p.x));
        const endX = Math.max(...screenPoints.map(p => p.x));
        const avgY = screenPoints.reduce((s, p) => s + p.y, 0) / screenPoints.length;

        const wordEls = document.querySelectorAll("[data-word]");
        const underlinedWords: string[] = [];
        let underlinedVerse = 0;

        wordEls.forEach((el) => {
          const rect = el.getBoundingClientRect();
          const elCenterX = rect.left + rect.width / 2;
          const elMidY = rect.top + rect.height / 2;
          const elBottomPlusSlack = rect.bottom + rect.height;

          if (elCenterX >= startX && elCenterX <= endX && avgY >= elMidY && avgY <= elBottomPlusSlack) {
            underlinedWords.push(el.getAttribute("data-word") || "");
            underlinedVerse = parseInt(el.getAttribute("data-verse") || "0", 10);
          }
        });

        if (underlinedWords.length > 0 && underlinedVerse > 0) {
          onUnderlineGesture(underlinedVerse, underlinedWords.join(" "));
          if (navigator.vibrate) navigator.vibrate(10);
          pointsBufferRef.current = [];
          return;
        }
      }
    }

    /* ── Dynamic verse linking ── */
    const bbox = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    currentPoints.forEach((p) => {
      bbox.minX = Math.min(bbox.minX, p.x);
      bbox.minY = Math.min(bbox.minY, p.y);
      bbox.maxX = Math.max(bbox.maxX, p.x);
      bbox.maxY = Math.max(bbox.maxY, p.y);
    });

    let closestVerse: number | null = null;
    let minDist = Infinity;

    if (svgRef.current) {
      const svgEl = svgRef.current;
      const ctmV = svgEl.getScreenCTM();
      if (ctmV) {
        const pt = svgEl.createSVGPoint();
        pt.x = (bbox.minX + bbox.maxX) / 2;
        pt.y = (bbox.minY + bbox.maxY) / 2;
        const screenCenter = pt.matrixTransform(ctmV);

        document.querySelectorAll("[data-verse]").forEach((el) => {
          const rect = el.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const dist = Math.hypot(centerX - screenCenter.x, centerY - screenCenter.y);
          if (dist < minDist) {
            minDist = dist;
            const vNum = parseInt(el.getAttribute("data-verse") ?? "", 10);
            if (!isNaN(vNum)) closestVerse = vNum;
          }
        });
      }
    }

    /* ── Stroke compression ── */
    const simplified = simplify(
      currentPoints.map((p) => ({ x: p.x, y: p.y })),
      0.5,
      true,
    );
    const compressedPoints: Point[] = simplified.map((sp) => {
      let best = currentPoints[0];
      let bestDist = Infinity;
      for (const op of currentPoints) {
        const d = (op.x - sp.x) ** 2 + (op.y - sp.y) ** 2;
        if (d < bestDist) { bestDist = d; best = op; }
      }
      return { x: sp.x, y: sp.y, pressure: best.pressure, tiltX: best.tiltX, tiltY: best.tiltY };
    });

    const newStroke: InkStroke = {
      id: `ink-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      points: compressedPoints,
      color: penColorRef.current,
      size: penSizeRef.current,
      linkedVerse: closestVerse,
      glow: penGlowRef.current,
    };

    onStrokeComplete(newStroke);
    pointsBufferRef.current = [];
  }, [zoom, onStrokeComplete, onCircleSelect, onWordCircle, onUnderlineGesture, onXGesture]);

  /* ── Window-level pointer capture ── */
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "pen") {
        e.preventDefault();
        lastPenDownRef.current = Date.now();

        if (!firstContactFiredRef.current && onPencilFirstContact) {
          firstContactFiredRef.current = true;
          onPencilFirstContact();
        }
      } else if (e.pointerType === "touch") {
        if (Date.now() - lastPenDownRef.current < TOUCH_LOCKOUT_MS) return;
        if (!fingerDrawing) return;
        if (!e.isPrimary) return;
        e.preventDefault();
      } else {
        return;
      }

      isDrawingRef.current = true;
      setSelectedStrokeId(null);
      setHoverPos(null);

      const [x, y] = getTransformedPoint(e.clientX, e.clientY);
      pointsBufferRef.current = [{ x, y, pressure: e.pressure || 0.5, tiltX: e.tiltX, tiltY: e.tiltY }];

      if (livePathRef.current) {
        livePathRef.current.style.display = "none";
        livePathRef.current.removeAttribute("d");
      }

      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = requestAnimationFrame(renderLoop);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "pen" && e.pressure === 0 && !isDrawingRef.current) {
        const [x, y] = getTransformedPoint(e.clientX, e.clientY);
        setHoverPos({ x, y });
        return;
      }

      if (!isDrawingRef.current) return;
      if (e.pointerType !== "pen" && !(e.pointerType === "touch" && fingerDrawing)) return;

      setHoverPos(null);

      const coalesced = e.getCoalescedEvents?.() ?? [e];
      for (const ce of coalesced) {
        const [cx, cy] = getTransformedPoint(ce.clientX, ce.clientY);
        pointsBufferRef.current.push({
          x: cx, y: cy,
          pressure: ce.pressure ?? 0.5,
          tiltX: ce.tiltX,
          tiltY: ce.tiltY,
        });
      }
    };

    const onUp = (e: PointerEvent) => {
      if (!isDrawingRef.current) return;
      if (e.pointerType !== "pen" && !(e.pointerType === "touch" && fingerDrawing)) return;
      finalizeStroke();
    };

    const onCancel = () => {
      isDrawingRef.current = false;
      cancelAnimationFrame(rafIdRef.current);
      pointsBufferRef.current = [];
      if (livePathRef.current) {
        livePathRef.current.style.display = "none";
        livePathRef.current.removeAttribute("d");
      }
    };

    window.addEventListener("pointerdown", onDown, { passive: false });
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);

    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
    };
  }, [fingerDrawing, getTransformedPoint, renderLoop, finalizeStroke, onPencilFirstContact]);

  /* ── Cleanup RAF on unmount ── */
  useEffect(() => {
    return () => cancelAnimationFrame(rafIdRef.current);
  }, []);

  /* ── Keyboard undo ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        onUndo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onUndo]);

  /* ── Suppress touch events from Apple Pencil during drawing ── */
  useEffect(() => {
    const suppress = (e: TouchEvent) => {
      if (isDrawingRef.current) {
        e.preventDefault();
      }
    };
    document.addEventListener("touchstart", suppress, { passive: false });
    document.addEventListener("touchmove", suppress, { passive: false });
    return () => {
      document.removeEventListener("touchstart", suppress);
      document.removeEventListener("touchmove", suppress);
    };
  }, []);

  /* ── Rendered committed strokes (brush-aware filters from store) ── */
  const renderedStrokes = useMemo(
    () =>
      strokes.map((s) => {
        const brushOpts = getBrushStrokeOptions(store.brushStyle, s.size, 0.5);
        const outline = getStroke(
          s.points.map((p) => [p.x, p.y, p.pressure]),
          { ...brushOpts, size: s.size, start: STROKE_OPTIONS.start, end: STROKE_OPTIONS.end },
        );
        const pathData = getSvgPathFromStroke(outline);
        if (!pathData) return null;
        const isSepia = s.color === SEPIA_COLOR;
        const isNeon = !!s.glow;
        const neonFilterId = isNeon ? `neon-${s.glow!.replace("#", "")}` : null;
        const brushFilterId = getActiveFilterId(store.activeTool, store.brushStyle);
        const bleedFilter = isDark ? "url(#ink-bleed-dark)" : "url(#ink-bleed)";
        const appliedFilter = isNeon
          ? `url(#${neonFilterId})`
          : brushFilterId
            ? `url(#${brushFilterId})`
            : bleedFilter;
        return (
          <path
            key={s.id}
            d={pathData}
            fill={s.color}
            stroke="none"
            opacity={isSepia ? 0.6 : effectiveOpacity}
            filter={appliedFilter}
            style={{
              mixBlendMode: isNeon ? "screen" : isSepia ? (isDark ? "screen" : "multiply") : undefined,
            }}
          />
        );
      }),
    [strokes, isDark, store.brushStyle, store.activeTool, effectiveOpacity],
  );

  return (
      <svg
        ref={svgRef}
        className="absolute inset-0 z-10"
        width={canvasWidth ?? "100%"}
        height={canvasHeight ?? "100%"}
        viewBox={canvasWidth && canvasHeight ? `${-canvasWidth/2} ${-canvasHeight/2} ${canvasWidth} ${canvasHeight}` : undefined}
        style={{
          pointerEvents: "none",
          cursor: "crosshair",
          overflow: "visible",
        }}
      >
        <defs>
          <filter id="ink-bleed">
            <feGaussianBlur stdDeviation="0.3" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.95" />
            </feComponentTransfer>
          </filter>
          <filter id="ink-bleed-dark">
            <feGaussianBlur stdDeviation="0.25" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="1.0" />
            </feComponentTransfer>
          </filter>
          {[
            { id: "neon-00FFFF", bloom: "#00FFFF" },
            { id: "neon-FF00FF", bloom: "#FF00FF" },
            { id: "neon-39FF14", bloom: "#39FF14" },
          ].map(({ id, bloom }) => (
            <filter key={id} id={id} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
              <feFlood floodColor={bloom} floodOpacity="0.8" result="glowColor" />
              <feComposite in="glowColor" in2="blur" operator="in" result="softGlow" />
              <feMerge>
                <feMergeNode in="softGlow" />
                <feMergeNode in="softGlow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ))}
        </defs>
        <InkFilterDefs standalone={false} />
        {renderedStrokes}

        <path
          ref={livePathRef}
          fill={effectiveColor}
          stroke="none"
          opacity={0.7}
          style={{ display: "none", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.1))" }}
        />

        {hoverPos && !isDrawingRef.current && (
          <circle
            cx={hoverPos.x}
            cy={hoverPos.y}
            r={effectiveSize / 2}
            fill={effectiveColor}
            opacity={0.25}
            style={{ pointerEvents: "none" }}
          />
        )}

        {xFlash && (
          <text
            x={xFlash.x}
            y={xFlash.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="32"
            fill="hsl(0, 72%, 51%)"
            style={{
              pointerEvents: "none",
              animation: "xFlashFade 400ms ease-out forwards",
            }}
          >
            ✕
          </text>
        )}
      </svg>
  );
}
