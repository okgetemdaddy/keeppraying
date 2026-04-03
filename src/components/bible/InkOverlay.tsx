import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { getStroke } from "perfect-freehand";
import simplify from "simplify-js";
import type { Point } from "./HandwritingEngine";
import { isClosedLoop, findVersesInsideStroke } from "@/lib/convexHull";
import { type BrushType, type BrushConfig, BRUSH_PRESETS, getBrushStrokeOptions, resolveBrush } from "@/lib/brushEngine";
import { BrushTextures } from "./BrushTextures";

/**
 * @native-port — INTERNAL ENGINEERING NOTES (not user-facing)
 * ─────────────────────────────────────────────────────────
 *
 * THE "TRANSPARENT GLASS" PATTERN
 *
 * The current RAF + SVG approach achieves ~4ms per frame via direct DOM
 * mutation (bypassing React state), but this hits a theoretical ceiling
 * in WKWebView. Native PKCanvasView on iPadOS achieves 9ms latency with
 * Metal-backed rendering. To reach parity, the architecture must become
 * a composite: DOM handles typography/layout, a native PKCanvasView sits
 * directly above it for ink physics.
 *
 * SWIFT CAPACITOR PLUGIN SCAFFOLD:
 *
 *   import UIKit
 *   import PencilKit
 *   import Capacitor
 *
 *   @objc(PencilKitBridge)
 *   public class PencilKitBridge: CAPPlugin, PKCanvasViewDelegate {
 *       var canvasView: PKCanvasView!
 *
 *       public override func load() {
 *           canvasView = PKCanvasView(frame: webView!.bounds)
 *           canvasView.isOpaque = false          // Let DOM text show through
 *           canvasView.backgroundColor = .clear
 *           canvasView.delegate = self
 *           canvasView.drawingPolicy = .pencilOnly  // Palm rejection
 *           webView!.scrollView.addSubview(canvasView)
 *           canvasView.tool = PKInkingTool(.pen, color: .black, width: 2.0)
 *       }
 *
 *       public func canvasViewDrawingDidChange(_ canvasView: PKCanvasView) {
 *           let drawingData = canvasView.drawing.dataRepresentation()
 *           let base64String = drawingData.base64EncodedString()
 *           self.notifyListeners("onNativeInkUpdated", data: [
 *               "drawingBase64": base64String
 *           ])
 *       }
 *   }
 *
 * 120Hz COALESCED & PREDICTED TOUCHES:
 *
 * Apple Pencil samples at 240Hz; iPad Pro renders at 120Hz. Standard
 * PointerEvents only fire at display refresh, losing 50% of curvature
 * data. In the native layer, extract sub-frame telemetry:
 *
 *   override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent?) {
 *       guard let touch = touches.first, let event = event else { return }
 *       let coalesced = event.coalescedTouches(for: touch) ?? []
 *       for cTouch in coalesced {
 *           // Append force, azimuth, altitude to point buffer
 *       }
 *       let predicted = event.predictedTouches(for: touch) ?? []
 *       for pTouch in predicted {
 *           // Draw to temporary prediction layer, flush on next frame
 *       }
 *   }
 *
 * When PKCanvasView is active, this file's SVG rendering becomes a
 * fallback for non-iPadOS platforms only.
 */

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
  brushType?: BrushType;
  opacity?: number;
}

interface InkOverlayProps {
  zoom: number;
  strokes: InkStroke[];
  onStrokeComplete: (stroke: InkStroke) => void;
  onUndo: () => void;
  penColor?: string;
  penSize?: number;
  penGlow?: string | null;
  activeBrush?: BrushConfig;
  activeOpacity?: number;
  fingerDrawing?: boolean;
  isDark?: boolean;
  /** Callback when a circle-to-select gesture encloses verses */
  onCircleSelect?: (verseNumbers: number[]) => void;
  /** Callback for first-run Apple Pencil onboarding */
  onPencilFirstContact?: () => void;
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

/* ── Palm rejection: touch-lockout window after pen down ── */
const TOUCH_LOCKOUT_MS = 500;

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
}: InkOverlayProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const livePathRef = useRef<SVGPathElement>(null);
  const [selectedStrokeId, setSelectedStrokeId] = useState<string | null>(null);

  // ── RAF point buffer (NOT React state — avoids re-renders per pointer event) ──
  const pointsBufferRef = useRef<Point[]>([]);
  const isDrawingRef = useRef(false);
  const rafIdRef = useRef<number>(0);

  // Hover preview state (Apple Pencil hover)
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  // Palm rejection: timestamp of last pen-down
  const lastPenDownRef = useRef<number>(0);

  // First-contact tracking
  const firstContactFiredRef = useRef(false);

  // Stable refs for current pen settings (avoid stale closures in RAF loop)
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

      // Use SVG's native coordinate transform (handles zoom, scroll, transform-origin)
      const screenCTM = svg.getScreenCTM();
      if (screenCTM) {
        const pt = svg.createSVGPoint();
        pt.x = clientX;
        pt.y = clientY;
        const transformed = pt.matrixTransform(screenCTM.inverse());
        return [transformed.x, transformed.y];
      }

      // Fallback to manual calculation
      const rect = svg.getBoundingClientRect();
      return [(clientX - rect.left) / zoom, (clientY - rect.top) / zoom];
    },
    [zoom],
  );

  /* ── RAF render loop: reads point buffer, writes to SVG path directly ── */
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

  /* ── Pointer handlers with enhanced palm rejection ── */
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (e.pointerType === "pen") {
        // Palm filter: contact-size + pressure floor
        if (e.pressure < 0.01 || e.width > 20 || e.height > 20) return;
        lastPenDownRef.current = Date.now();

        // First-run Apple Pencil onboarding
        if (!firstContactFiredRef.current && onPencilFirstContact) {
          firstContactFiredRef.current = true;
          onPencilFirstContact();
        }
      } else if (e.pointerType === "touch") {
        // 500ms touch-lockout after pen contact
        if (Date.now() - lastPenDownRef.current < TOUCH_LOCKOUT_MS) return;
        if (!fingerDrawing) return;
      } else {
        return; // Reject mouse on iPad
      }

      if (e.button !== 0) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      isDrawingRef.current = true;
      setSelectedStrokeId(null);
      setHoverPos(null);

      const [x, y] = getTransformedPoint(e.clientX, e.clientY);
      pointsBufferRef.current = [{ x, y, pressure: e.pressure ?? 0.5, tiltX: e.tiltX, tiltY: e.tiltY }];

      // Hide live path initially
      if (livePathRef.current) {
        livePathRef.current.style.display = "none";
        livePathRef.current.removeAttribute("d");
      }

      // Start the RAF render loop
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = requestAnimationFrame(renderLoop);
    },
    [getTransformedPoint, fingerDrawing, renderLoop, onPencilFirstContact],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      // Apple Pencil hover detection (pressure === 0, pointerType === "pen")
      if (e.pointerType === "pen" && e.pressure === 0 && !isDrawingRef.current) {
        const [x, y] = getTransformedPoint(e.clientX, e.clientY);
        setHoverPos({ x, y });
        return;
      }

      if (!isDrawingRef.current) return;
      if (e.pointerType !== "pen" && !(e.pointerType === "touch" && fingerDrawing)) return;

      setHoverPos(null);

      // ── ProMotion 120Hz: capture sub-frame coalesced events ──
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

    // Hide live preview path
    if (livePathRef.current) {
      livePathRef.current.style.display = "none";
      livePathRef.current.removeAttribute("d");
    }

    const currentPoints = pointsBufferRef.current;
    if (currentPoints.length < 3) {
      pointsBufferRef.current = [];
      return;
    }

    /* ── Circle-to-Select detection ── */
    if (onCircleSelect && svgRef.current) {
      const matched = findVersesInsideStroke(currentPoints, svgRef.current, zoom);
      if (matched.length > 0) {
        onCircleSelect(matched);
        pointsBufferRef.current = [];
        return; // Don't create a stroke for selection gestures
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

    /* ── Stroke Finalizer: Ramer-Douglas-Peucker compression ──
     * Coalesced events capture 2-4× more points per frame. Before saving
     * to the database, simplify the path to reduce point count ~50-70%
     * while preserving the handwritten character of curves. */
    const simplified = simplify(
      currentPoints.map(p => ({ x: p.x, y: p.y })),
      0.5,
      true,
    );
    // Re-attach pressure/tilt from nearest original point
    const compressedPoints: Point[] = simplified.map(sp => {
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
  }, [penColor, penSize, penGlow, zoom, onStrokeComplete, onCircleSelect]);

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

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 z-10"
      width="100%"
      height="100%"
      style={{
        touchAction: "none",
        cursor: isDrawingRef.current ? "none" : "crosshair",
        pointerEvents: "auto",
        overflow: "visible",
      }}
      onPointerDown={handlePointerDown}
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
        {/* ── Neon glow filters ── */}
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

      {/* ── Live preview path: mutated directly by RAF, no React state ── */}
      <path
        ref={livePathRef}
        fill={penColor}
        stroke="none"
        opacity={0.7}
        style={{ display: "none", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.1))" }}
      />

      {/* Apple Pencil hover ghost cursor */}
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
    </svg>
  );
}
