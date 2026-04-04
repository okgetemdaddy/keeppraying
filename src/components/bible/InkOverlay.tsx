import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
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
  onCircleSelect?: (verseNumbers: number[], hullCenter?: { x: number; y: number }) => void;
  onPencilFirstContact?: () => void;
  /** Callback when a circle encloses 1-4 words from a single verse */
  onWordCircle?: (words: string, verseNumber: number, anchorPoint: { x: number; y: number }) => void;
  /** Callback when an underline gesture is detected over text */
  onUnderlineGesture?: (verseNumber: number, underlinedText: string) => void;
  /** Callback when an X gesture is detected — bbox is in SVG coordinates */
  onXGesture?: (bbox: { minX: number; minY: number; maxX: number; maxY: number }) => void;
}

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

  // Must be big enough and roughly square-ish
  if (xRange < 20 || yRange < 20) return nope;
  if (xRange / yRange > 4 || yRange / xRange > 4) return nope;

  // Find the sharpest direction reversal point (vertex of the X)
  let bestReversal = -1;
  let bestIdx = Math.floor(points.length / 2);
  for (let i = 2; i < points.length - 2; i++) {
    const dx1 = points[i].x - points[i - 2].x;
    const dy1 = points[i].y - points[i - 2].y;
    const dx2 = points[i + 2].x - points[i].x;
    const dy2 = points[i + 2].y - points[i].y;
    // Dot product of direction vectors — most negative = sharpest reversal
    const dot = dx1 * dx2 + dy1 * dy2;
    const mag = Math.sqrt((dx1 * dx1 + dy1 * dy1) * (dx2 * dx2 + dy2 * dy2)) || 1;
    const cosAngle = dot / mag;
    if (cosAngle < bestReversal || bestReversal === -1) {
      bestReversal = cosAngle;
      bestIdx = i;
    }
  }

  // Must have a sharp reversal (cos < -0.15 means angle > ~99°)
  if (bestReversal > -0.15) return nope;

  const seg1 = points.slice(0, bestIdx + 1);
  const seg2 = points.slice(bestIdx);

  // Each segment should span most of the bbox
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
  onCircleSelect,
  onPencilFirstContact,
  onWordCircle,
  onUnderlineGesture,
  onXGesture,
}: InkOverlayProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const livePathRef = useRef<SVGPathElement>(null);
  const [selectedStrokeId, setSelectedStrokeId] = useState<string | null>(null);
  const [xFlash, setXFlash] = useState<{ x: number; y: number } | null>(null);

  // ── RAF point buffer (NOT React state) ──
  const pointsBufferRef = useRef<Point[]>([]);
  const isDrawingRef = useRef(false);
  const rafIdRef = useRef<number>(0);

  // ── Dynamic canvas sizing via ResizeObserver ──
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const svg = svgRef.current;
    const parent = svg?.parentElement;
    if (!parent) return;

    const updateSize = () => {
      setCanvasSize({
        width: parent.scrollWidth,
        height: parent.scrollHeight,
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(parent);
    return () => observer.disconnect();
  }, [zoom]);

  // Hover preview state
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  // Palm rejection
  const lastPenDownRef = useRef<number>(0);
  const firstContactFiredRef = useRef(false);

  // Stable refs for current pen settings
  const penColorRef = useRef(penColor);
  const penSizeRef = useRef(penSize);
  const penGlowRef = useRef(penGlow);
  penColorRef.current = penColor;
  penSizeRef.current = penSize;
  penGlowRef.current = penGlow ?? null;

  /* ── DOMMatrix-based coordinate normalization ── */
  const getTransformedPoint = useCallback(
    (clientX: number, clientY: number): [number, number] => {
      const svg = svgRef.current;
      if (!svg) return [0, 0];
      const screenCTM = svg.getScreenCTM();
      if (screenCTM) {
        const pt = svg.createSVGPoint();
        pt.x = clientX;
        pt.y = clientY;
        const transformed = pt.matrixTransform(screenCTM.inverse());
        return [transformed.x, transformed.y];
      }
      const rect = svg.getBoundingClientRect();
      return [(clientX - rect.left) / zoom, (clientY - rect.top) / zoom];
    },
    [zoom],
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

  /* ── Pointer handlers ── */
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (e.pointerType === "pen") {
        // No pressure check — Apple Pencil Pro reports pressure=0 on pointerdown
        // in iPadOS Safari. Real pressure arrives on first pointermove.
        // Hover is distinguished by pointerdown never firing during hover.
        lastPenDownRef.current = Date.now();
        // Pen events: capture and prevent passthrough
        e.preventDefault();
        e.stopPropagation();

        if (!firstContactFiredRef.current && onPencilFirstContact) {
          firstContactFiredRef.current = true;
          onPencilFirstContact();
        }
      } else if (e.pointerType === "touch") {
        if (Date.now() - lastPenDownRef.current < TOUCH_LOCKOUT_MS) return;
        if (!fingerDrawing) return; // finger taps pass through to HTML below
        e.preventDefault();
        e.stopPropagation();
      } else {
        return;
      }

      e.currentTarget.setPointerCapture(e.pointerId);
      isDrawingRef.current = true;
      setSelectedStrokeId(null);
      setHoverPos(null);

      const [x, y] = getTransformedPoint(e.clientX, e.clientY);
      pointsBufferRef.current = [{ x, y, pressure: e.pressure ?? 0.5, tiltX: e.tiltX, tiltY: e.tiltY }];

      if (livePathRef.current) {
        livePathRef.current.style.display = "none";
        livePathRef.current.removeAttribute("d");
      }

      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = requestAnimationFrame(renderLoop);
    },
    [getTransformedPoint, fingerDrawing, renderLoop, onPencilFirstContact],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (Math.random() < 0.02) {
        setDebugLog(prev => [...prev.slice(-8), `MOVE: type=${e.pointerType} pressure=${e.pressure.toFixed(3)} drawing=${isDrawingRef.current}`]);
      }
      if (e.pointerType === "pen" && e.pressure === 0 && !isDrawingRef.current) {
        const [x, y] = getTransformedPoint(e.clientX, e.clientY);
        setHoverPos({ x, y });
        return;
      }

      if (!isDrawingRef.current) return;
      if (e.pointerType !== "pen" && !(e.pointerType === "touch" && fingerDrawing)) return;

      setHoverPos(null);

      const coalesced = (e.nativeEvent as PointerEvent).getCoalescedEvents?.() ?? [e.nativeEvent as PointerEvent];
      for (const ce of coalesced) {
        const [cx, cy] = getTransformedPoint(ce.clientX, ce.clientY);
        pointsBufferRef.current.push({
          x: cx, y: cy,
          pressure: ce.pressure ?? 0.5,
          tiltX: ce.tiltX,
          tiltY: ce.tiltY,
        });
      }
    },
    [getTransformedPoint, fingerDrawing],
  );

  const handlePointerUp = useCallback(() => {
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

        // Word-level hit testing
        const wordElements = document.querySelectorAll("[data-word]");
        const enclosedWords: Array<{ word: string; verse: number; element: Element }> = [];

        wordElements.forEach((el) => {
          const rect = el.getBoundingClientRect();
          const center = {
            x: (rect.left + rect.width / 2 - svgRect.left) / zoom,
            y: (rect.top + rect.height / 2 - svgRect.top) / zoom,
          };
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

          // 1-4 words from single verse → word study
          if (enclosedWords.length <= 4 && uniqueVerses.length === 1 && onWordCircle) {
            const words = enclosedWords.map((w) => w.word).join(" ");
            const xs = currentPoints.map((p) => p.x);
            const ys = currentPoints.map((p) => p.y);
            const centerX = svgRect.left + (xs.reduce((a, b) => a + b, 0) / xs.length) * zoom;
            const centerY = svgRect.top + (ys.reduce((a, b) => a + b, 0) / ys.length) * zoom;
            onWordCircle(words, uniqueVerses[0], { x: centerX, y: centerY });
            pointsBufferRef.current = [];
            return;
          }

          // 5+ words or multiple verses → verse selection (existing behavior)
          if (onCircleSelect) {
            const xs = currentPoints.map((p) => p.x);
            const ys = currentPoints.map((p) => p.y);
            const centerX = svgRect.left + (xs.reduce((a, b) => a + b, 0) / xs.length) * zoom;
            const centerY = svgRect.top + (ys.reduce((a, b) => a + b, 0) / ys.length) * zoom;
            onCircleSelect(uniqueVerses, { x: centerX, y: centerY });
            pointsBufferRef.current = [];
            return;
          }
        }

        // Fallback: verse-level detection (original behavior for when no data-word spans exist)
        if (onCircleSelect) {
          const matched = findVersesInsideStroke(currentPoints, svgRef.current, zoom);
          if (matched.length > 0) {
            const xs = currentPoints.map((p) => p.x / zoom);
            const ys = currentPoints.map((p) => p.y / zoom);
            const centerX = svgRect.left + (xs.reduce((a, b) => a + b, 0) / xs.length);
            const centerY = svgRect.top + (ys.reduce((a, b) => a + b, 0) / ys.length);
            onCircleSelect(matched, { x: centerX, y: centerY });
            pointsBufferRef.current = [];
            return;
          }
        }
      }
    }

    /* ── X-gesture detection (delete highlights & ink) ── */
    if (onXGesture && !isClosedLoop(currentPoints)) {
      const xResult = isXGesture(currentPoints);
      if (xResult.detected) {
        const centerX = (xResult.bbox.minX + xResult.bbox.maxX) / 2;
        const centerY = (xResult.bbox.minY + xResult.bbox.maxY) / 2;
        // Flash red × at center
        setXFlash({ x: centerX, y: centerY });
        setTimeout(() => setXFlash(null), 400);
        // Haptic double-tap
        if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
        onXGesture(xResult.bbox);
        pointsBufferRef.current = [];
        return;
      }
    }

    /* ── Underline gesture detection ── */
    if (onUnderlineGesture && isUnderlineGesture(currentPoints) && svgRef.current) {
      const svgRect = svgRef.current.getBoundingClientRect();
      const startX = Math.min(...currentPoints.map((p) => p.x)) * zoom + svgRect.left;
      const endX = Math.max(...currentPoints.map((p) => p.x)) * zoom + svgRect.left;
      const avgY = (currentPoints.reduce((s, p) => s + p.y, 0) / currentPoints.length) * zoom + svgRect.top;

      const wordEls = document.querySelectorAll("[data-word]");
      const underlinedWords: string[] = [];
      let underlinedVerse = 0;

      wordEls.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const elCenterX = rect.left + rect.width / 2;
        const elBottom = rect.bottom;

        if (elCenterX >= startX && elCenterX <= endX && Math.abs(avgY - elBottom) < rect.height * 0.5) {
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
    const svgRect = svgRef.current?.getBoundingClientRect();

    if (svgRect) {
      document.querySelectorAll("[data-verse]").forEach((el) => {
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const strokeCenterX = ((bbox.minX + bbox.maxX) / 2) * zoom + svgRect.left;
        const strokeCenterY = ((bbox.minY + bbox.maxY) / 2) * zoom + svgRect.top;
        const dist = Math.hypot(centerX - strokeCenterX, centerY - strokeCenterY);
        if (dist < minDist) {
          minDist = dist;
          const vNum = parseInt(el.getAttribute("data-verse") ?? "", 10);
          if (!isNaN(vNum)) closestVerse = vNum;
        }
      });
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
      color: penColor,
      size: penSize,
      linkedVerse: closestVerse,
      glow: penGlow ?? null,
    };

    onStrokeComplete(newStroke);
    pointsBufferRef.current = [];
  }, [penColor, penSize, penGlow, zoom, onStrokeComplete, onCircleSelect, onWordCircle, onUnderlineGesture, onXGesture]);

  const handlePointerCancel = useCallback(() => {
    isDrawingRef.current = false;
    cancelAnimationFrame(rafIdRef.current);
    pointsBufferRef.current = [];
    if (livePathRef.current) {
      livePathRef.current.style.display = "none";
      livePathRef.current.removeAttribute("d");
    }
  }, []);

  const handlePointerLeave = useCallback(() => {
    setHoverPos(null);
    if (isDrawingRef.current) {
      handlePointerUp();
    }
  }, [handlePointerUp]);

  /* ── Cleanup RAF on unmount ── */
  useEffect(() => {
    return () => cancelAnimationFrame(rafIdRef.current);
  }, []);

  /* ── Global touch suppression while Pencil is active ── */
  useEffect(() => {
    const suppress = (ev: TouchEvent) => {
      if (isDrawingRef.current) ev.preventDefault();
    };
    document.addEventListener("touchstart", suppress, { passive: false });
    document.addEventListener("touchmove", suppress, { passive: false });
    return () => {
      document.removeEventListener("touchstart", suppress);
      document.removeEventListener("touchmove", suppress);
    };
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

  /* ── Rendered committed strokes ── */
  const renderedStrokes = useMemo(
    () =>
      strokes.map((s) => {
        const outline = getStroke(
          s.points.map((p) => [p.x, p.y, p.pressure]),
          { ...STROKE_OPTIONS, size: s.size },
        );
        const pathData = getSvgPathFromStroke(outline);
        if (!pathData) return null;
        const isSelected = selectedStrokeId === s.id;
        const isSepia = s.color === SEPIA_COLOR;
        const isNeon = !!s.glow;
        const neonFilterId = isNeon ? `neon-${s.glow!.replace("#", "")}` : null;
        const bleedFilter = isDark ? "url(#ink-bleed-dark)" : "url(#ink-bleed)";
        const appliedFilter = isSelected
          ? undefined
          : isNeon
            ? `url(#${neonFilterId})`
            : bleedFilter;
        return (
          <path
            key={s.id}
            d={pathData}
            fill={s.color}
            stroke="none"
            opacity={isSepia ? 0.6 : isSelected ? 0.5 : 0.98}
            filter={appliedFilter}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedStrokeId(isSelected ? null : s.id);
            }}
            className="cursor-pointer"
            style={{
              mixBlendMode: isNeon ? "screen" : isSepia ? (isDark ? "screen" : "multiply") : undefined,
              filter: isSelected ? "drop-shadow(0 0 4px hsl(var(--primary)))" : undefined,
            }}
          />
        );
      }),
    [strokes, selectedStrokeId, isDark],
  );

  // Compute SVG dimensions — use dynamic canvas size or fallback to 100%
  const svgWidth = canvasSize.width || "100%";
  const svgHeight = canvasSize.height || "100%";
  const viewBox = canvasSize.width && canvasSize.height
    ? `0 0 ${canvasSize.width} ${canvasSize.height}`
    : undefined;

  return (
    <>
      <svg
        ref={svgRef}
        className="absolute inset-0 z-10"
        width={svgWidth}
        height={svgHeight}
        viewBox={viewBox}
        style={{
          touchAction: "none",
          cursor: isDrawingRef.current ? "none" : "crosshair",
          pointerEvents: "auto",
          overflow: "visible",
        }}
        onPointerDown={(e) => {
          setDebugLog(prev => [...prev.slice(-8), `SVG-RAW: type=${e.pointerType} pressure=${e.pressure.toFixed(3)}`]);
          handlePointerDown(e);
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onPointerCancel={handlePointerCancel}
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
        {renderedStrokes}

        <path
          ref={livePathRef}
          fill={penColor}
          stroke="none"
          opacity={0.7}
          style={{ display: "none", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.1))" }}
        />

        {hoverPos && !isDrawingRef.current && (
          <circle
            cx={hoverPos.x}
            cy={hoverPos.y}
            r={penSize / 2}
            fill={penColor}
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
      <div style={{
        position: 'fixed',
        bottom: 80,
        left: 10,
        right: 10,
        maxHeight: 180,
        overflow: 'auto',
        background: 'rgba(0,0,0,0.85)',
        color: '#0f0',
        fontFamily: 'monospace',
        fontSize: 10,
        padding: 8,
        borderRadius: 8,
        zIndex: 9999,
        pointerEvents: 'none',
      }}>
        {debugLog.map((line, i) => <div key={i}>{line}</div>)}
        {debugLog.length === 0 && <div style={{color:'#666'}}>Touch pencil to screen...</div>}
      </div>
    </>
  );
}
