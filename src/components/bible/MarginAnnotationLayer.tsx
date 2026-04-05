import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { getStroke } from "perfect-freehand";
import simplify from "simplify-js";
import { isClosedLoop, convexHull, pointInPolygon, findVersesInsideStroke } from "@/lib/convexHull";
import { usePencilTools, getBrushStrokeOptions, getActiveFilterId } from "@/hooks/usePencilTools";
import InkFilterDefs from "@/components/bible/toolbar/InkFilterDefs";

// iPadOS: MarginAnnotationLayer maps to PKCanvasView overlay with PKToolPicker hidden, pencilOnly input policy

/* ── Types ── */

export interface MarginInkStroke {
  id: string;
  points: Array<{ x: number; y: number; pressure: number; tiltX: number; tiltY: number }>;
  color: string;
  size: number;
  verseAnchor: number | null;
  xPercent: number;
  yOffset: number;
  containerWidthAtCapture: number;
  timestamp: number;
}

interface MarginAnnotationLayerProps {
  active: boolean;
  strokes: MarginInkStroke[];
  onStrokeComplete: (stroke: MarginInkStroke) => void;
  onUnderlineGesture: (verseNumber: number, text: string) => void;
  onCircleSelect: (verseNumbers: number[], center: { x: number; y: number }) => void;
  onWordCircle?: (words: string, verseNumber: number, anchorPoint: { x: number; y: number }) => void;
  onXGesture: (strokeIds: string[]) => void;
  penColor: string;
  penSize: number;
  scrollContainerRef: React.RefObject<HTMLElement>;
}

/* ── SVG path helper (same as InkOverlay) ── */
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

/* ── Stroke rendering options (identical to InkOverlay) ── */
const STROKE_OPTIONS = {
  thinning: 0.5,
  smoothing: 0.5,
  streamline: 0.5,
  simulatePressure: false,
  start: { taper: 12, easing: (t: number) => t * t },
  end: { taper: 8, easing: (t: number) => t },
};

const TOUCH_LOCKOUT_MS = 500;

/* ── Gesture detection (reused from InkOverlay logic) ── */
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
    }
  }
  if (bestReversal > -0.15) return nope;
  return { detected: true, bbox: { minX, minY, maxX, maxY } };
}

type Point = { x: number; y: number; pressure: number; tiltX: number; tiltY: number };

/* ═══════════════════════════════════════════════════
   MARGIN ANNOTATION LAYER
   ═══════════════════════════════════════════════════ */
// iPadOS: This entire component maps to a native PKCanvasView glass layer
// with PKToolPicker hidden. Only Apple Pencil input policy is active.
// Coordinate bridge syncs scroll offset via webkit.messageHandlers.pencilBridge.

export function MarginAnnotationLayer({
  active,
  strokes,
  onStrokeComplete,
  onUnderlineGesture,
  onCircleSelect,
  onWordCircle,
  onXGesture,
  penColor,
  penSize,
  scrollContainerRef,
}: MarginAnnotationLayerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const livePathRef = useRef<SVGPathElement>(null);
  const pointsBufferRef = useRef<Point[]>([]);
  const isDrawingRef = useRef(false);
  const rafIdRef = useRef<number>(0);
  const lastPenDownRef = useRef<number>(0);
  const [scrollContentHeight, setScrollContentHeight] = useState(2000);

  // ── Read from Zustand store (fallback to props for backward compat) ──
  const store = usePencilTools();
  const effectiveColor = store.color || penColor;
  const effectiveSize = store.size || penSize;

  // Stable refs for pen settings (reads from store)
  const penColorRef = useRef(effectiveColor);
  const penSizeRef = useRef(effectiveSize);
  penColorRef.current = effectiveColor;
  penSizeRef.current = effectiveSize;

  // ── ResizeObserver to track scroll content height ──
  // iPadOS: Height synced to PKCanvasView frame via bridge
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const update = () => setScrollContentHeight(el.scrollHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    // Also update on DOM mutations (verses loading)
    const mo = new MutationObserver(update);
    mo.observe(el, { childList: true, subtree: true });
    return () => { ro.disconnect(); mo.disconnect(); };
  }, [scrollContainerRef]);

  /* ── Scroll-relative coordinate transform ── */
  const getScrollRelativePoint = useCallback(
    (clientX: number, clientY: number): [number, number] => {
      const el = scrollContainerRef.current;
      if (!el) return [clientX, clientY];
      const rect = el.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top + el.scrollTop;
      return [x, y];
    },
    [scrollContainerRef],
  );

  /* ── Screen coordinate from scroll-relative ── */
  const scrollToScreen = useCallback(
    (sx: number, sy: number): [number, number] => {
      const el = scrollContainerRef.current;
      if (!el) return [sx, sy];
      const rect = el.getBoundingClientRect();
      return [sx + rect.left, sy - el.scrollTop + rect.top];
    },
    [scrollContainerRef],
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
        livePathRef.current.style.display = "";
      }
    }
    rafIdRef.current = requestAnimationFrame(renderLoop);
  }, []);

  /* ── Find nearest verse element by Y centroid ── */
  const findNearestVerse = useCallback(
    (scrollY: number): { verseNumber: number; el: Element } | null => {
      const el = scrollContainerRef.current;
      if (!el) return null;
      const verseEls = el.querySelectorAll("[data-verse]");
      let closest: { verseNumber: number; el: Element } | null = null;
      let minDist = Infinity;
      verseEls.forEach((ve) => {
        const rect = ve.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const verseScrollTop = rect.top - elRect.top + el.scrollTop;
        const verseCenterY = verseScrollTop + rect.height / 2;
        const dist = Math.abs(verseCenterY - scrollY);
        if (dist < minDist) {
          minDist = dist;
          const vn = parseInt(ve.getAttribute("data-verse") ?? "", 10);
          if (!isNaN(vn)) closest = { verseNumber: vn, el: ve };
        }
      });
      return closest;
    },
    [scrollContainerRef],
  );

  /* ── Finalize stroke ── */
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

    /* ── Circle gesture (word-level or verse-level) ── */
    if (isClosedLoop(currentPoints)) {
      const hull = convexHull(currentPoints);
      if (hull.length >= 3) {
        // Convert scroll-relative points to screen coords for word hit-testing
        const wordElements = scrollContainerRef.current?.querySelectorAll("[data-word]");
        const enclosedWords: Array<{ word: string; verse: number; element: Element }> = [];

        wordElements?.forEach((wordEl) => {
          const rect = wordEl.getBoundingClientRect();
          const elRect = scrollContainerRef.current!.getBoundingClientRect();
          const scrollTop = scrollContainerRef.current!.scrollTop;
          const centerX = rect.left - elRect.left + rect.width / 2;
          const centerY = rect.top - elRect.top + scrollTop + rect.height / 2;
          if (pointInPolygon({ x: centerX, y: centerY }, hull)) {
            enclosedWords.push({
              word: wordEl.getAttribute("data-word") || "",
              verse: parseInt(wordEl.getAttribute("data-verse") || "0", 10),
              element: wordEl,
            });
          }
        });

        if (enclosedWords.length > 0) {
          const uniqueVerses = [...new Set(enclosedWords.map((w) => w.verse))];
          const avgX = currentPoints.reduce((s, p) => s + p.x, 0) / currentPoints.length;
          const avgY = currentPoints.reduce((s, p) => s + p.y, 0) / currentPoints.length;
          const [screenX, screenY] = scrollToScreen(avgX, avgY);

          // 1-4 words in one verse → word circle (Reference Bloom)
          if (enclosedWords.length <= 4 && uniqueVerses.length === 1 && onWordCircle) {
            onWordCircle(
              enclosedWords.map((w) => w.word).join(" "),
              uniqueVerses[0],
              { x: screenX, y: screenY },
            );
            pointsBufferRef.current = [];
            return;
          }

          // Multi-verse circle → verse selection
          onCircleSelect(uniqueVerses, { x: screenX, y: screenY });
          pointsBufferRef.current = [];
          return;
        }
      }
    }

    /* ── X-gesture detection ── */
    if (!isClosedLoop(currentPoints)) {
      const xResult = isXGesture(currentPoints);
      if (xResult.detected) {
        // Find strokes whose bounding boxes intersect the X bbox
        const intersecting = strokes.filter((s) => {
          const sMinX = Math.min(...s.points.map((p) => p.x));
          const sMaxX = Math.max(...s.points.map((p) => p.x));
          const sMinY = Math.min(...s.points.map((p) => p.y));
          const sMaxY = Math.max(...s.points.map((p) => p.y));
          return !(sMaxX < xResult.bbox.minX || sMinX > xResult.bbox.maxX ||
                   sMaxY < xResult.bbox.minY || sMinY > xResult.bbox.maxY);
        });
        if (intersecting.length > 0) {
          if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
          onXGesture(intersecting.map((s) => s.id));
          pointsBufferRef.current = [];
          return;
        }
      }
    }

    /* ── Underline gesture detection ── */
    if (isUnderlineGesture(currentPoints)) {
      // Convert scroll-relative to screen for word hit-testing
      const screenPoints = currentPoints.map((p) => {
        const [sx, sy] = scrollToScreen(p.x, p.y);
        return { x: sx, y: sy };
      });
      const startX = Math.min(...screenPoints.map((p) => p.x));
      const endX = Math.max(...screenPoints.map((p) => p.x));
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

    /* ── Regular ink stroke — commit with verse anchoring ── */
    // Margin Mode ink is anchored to the BLOCK (verse element), not inline text.
    // If text reflows within a verse, ink stays proportionally positioned relative
    // to the verse bounding box — it doesn't track individual words.
    // For word-level precision, use iPad Study Mode (fixed canvas, no reflow).

    const compressed = simplify(
      currentPoints.map((p) => ({ x: p.x, y: p.y })),
      0.5,
      true,
    );
    const compressedPoints: Point[] = compressed.map((sp) => {
      let best = currentPoints[0];
      let bestDist = Infinity;
      for (const op of currentPoints) {
        const d = (op.x - sp.x) ** 2 + (op.y - sp.y) ** 2;
        if (d < bestDist) { bestDist = d; best = op; }
      }
      return { x: sp.x, y: sp.y, pressure: best.pressure, tiltX: best.tiltX, tiltY: best.tiltY };
    });

    // Compute verse anchor + percentage coordinates
    const strokeCenterY = compressedPoints.reduce((s, p) => s + p.y, 0) / compressedPoints.length;
    const strokeCenterX = compressedPoints.reduce((s, p) => s + p.x, 0) / compressedPoints.length;
    const nearestVerse = findNearestVerse(strokeCenterY);
    const containerWidth = scrollContainerRef.current?.clientWidth ?? 1;

    let xPercent = strokeCenterX / containerWidth;
    let yOffset = strokeCenterY;

    if (nearestVerse) {
      const verseRect = nearestVerse.el.getBoundingClientRect();
      const elRect = scrollContainerRef.current!.getBoundingClientRect();
      const verseScrollTop = verseRect.top - elRect.top + scrollContainerRef.current!.scrollTop;
      yOffset = strokeCenterY - verseScrollTop;
      xPercent = strokeCenterX / verseRect.width;
    }

    const newStroke: MarginInkStroke = {
      id: `margin-ink-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      points: compressedPoints,
      color: penColorRef.current,
      size: penSizeRef.current,
      verseAnchor: nearestVerse?.verseNumber ?? null,
      xPercent,
      yOffset,
      containerWidthAtCapture: containerWidth,
      timestamp: Date.now(),
    };

    onStrokeComplete(newStroke);
    pointsBufferRef.current = [];
  }, [strokes, onStrokeComplete, onCircleSelect, onWordCircle, onUnderlineGesture, onXGesture, findNearestVerse, scrollContainerRef, scrollToScreen]);

  /* ── Pointer event handlers ── */
  // iPadOS: Hardware gating maps to PKCanvasView.drawingPolicy = .pencilOnly

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // CRITICAL: Only capture pen input — never touch, never mouse
      if (e.pointerType === "touch" || e.pointerType === "mouse") return;
      if (e.pointerType !== "pen") return;

      e.preventDefault();
      e.stopPropagation();
      lastPenDownRef.current = Date.now();
      isDrawingRef.current = true;

      const [x, y] = getScrollRelativePoint(e.clientX, e.clientY);
      pointsBufferRef.current = [{
        x, y,
        pressure: e.pressure || 0.5,
        tiltX: e.tiltX,
        tiltY: e.tiltY,
      }];

      if (livePathRef.current) {
        livePathRef.current.style.display = "none";
        livePathRef.current.removeAttribute("d");
      }

      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = requestAnimationFrame(renderLoop);
    },
    [getScrollRelativePoint, renderLoop],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawingRef.current) return;
      if (e.pointerType !== "pen") return;

      const coalesced = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent];
      for (const ce of coalesced) {
        const [cx, cy] = getScrollRelativePoint(ce.clientX, ce.clientY);
        pointsBufferRef.current.push({
          x: cx, y: cy,
          pressure: ce.pressure ?? 0.5,
          tiltX: ce.tiltX,
          tiltY: ce.tiltY,
        });
      }
    },
    [getScrollRelativePoint],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawingRef.current) return;
      if (e.pointerType !== "pen") return;
      finalizeStroke();
    },
    [finalizeStroke],
  );

  /* ── Palm rejection: suppress touch during active drawing ── */
  // iPadOS: Palm rejection handled natively by PKCanvasView
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

  /* ── Cleanup RAF on unmount ── */
  useEffect(() => {
    return () => cancelAnimationFrame(rafIdRef.current);
  }, []);

  /* ── Rendered committed strokes (brush-aware) ── */
  const renderedStrokes = useMemo(() => {
    const currentWidth = scrollContainerRef.current?.clientWidth ?? 1;
    return strokes.map((s) => {
      const scaleFactor = s.containerWidthAtCapture > 0
        ? currentWidth / s.containerWidthAtCapture
        : 1;
      const scaledPoints = scaleFactor !== 1
        ? s.points.map((p) => ({ ...p, x: p.x * scaleFactor }))
        : s.points;

      const brushOpts = getBrushStrokeOptions(store.brushStyle, s.size, 0.5);
      const outline = getStroke(
        scaledPoints.map((p) => [p.x, p.y, p.pressure]),
        { ...brushOpts, size: s.size, start: STROKE_OPTIONS.start, end: STROKE_OPTIONS.end },
      );
      const pathData = getSvgPathFromStroke(outline);
      if (!pathData) return null;
      const brushFilterId = getActiveFilterId(store.activeTool, store.brushStyle);
      return (
        <path
          key={s.id}
          d={pathData}
          fill={s.color}
          stroke="none"
          opacity={0.98}
          filter={brushFilterId ? `url(#${brushFilterId})` : "url(#margin-ink-bleed)"}
        />
      );
    });
  }, [strokes, scrollContainerRef, store.brushStyle, store.activeTool]);

  if (!active) return null;

  return (
    <>
      {/* Capture layer — invisible, intercepts pen only */}
      {/* iPadOS: Capture layer replaced by native PKCanvasView with pencilOnly policy */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 40,
          pointerEvents: "auto",
          touchAction: "pan-y", // CRITICAL: lets finger scrolling pass through to Safari compositor
          height: scrollContentHeight,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          isDrawingRef.current = false;
          cancelAnimationFrame(rafIdRef.current);
          pointsBufferRef.current = [];
          if (livePathRef.current) {
            livePathRef.current.style.display = "none";
            livePathRef.current.removeAttribute("d");
          }
        }}
      />

      {/* Render layer — SVG ink paths, pointer-events: none */}
      {/* iPadOS: Render layer maps to PKDrawing snapshot exported as SVG paths */}
      <svg
        ref={svgRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: scrollContentHeight,
          pointerEvents: "none",
          zIndex: 39,
          overflow: "visible",
        }}
      >
        <defs>
          <filter id="margin-ink-bleed">
            <feGaussianBlur stdDeviation="0.3" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.95" />
            </feComponentTransfer>
          </filter>
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
      </svg>
    </>
  );
}
