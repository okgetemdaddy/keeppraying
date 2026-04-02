import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { getStroke } from "perfect-freehand";
import type { StrokeData, Point } from "./HandwritingEngine";

/* ── SVG path helper (same as HandwritingEngine) ── */
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
}

interface InkOverlayProps {
  zoom: number;
  strokes: InkStroke[];
  onStrokeComplete: (stroke: InkStroke) => void;
  onUndo: () => void;
  penColor?: string;
  penSize?: number;
  fingerDrawing?: boolean;
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

export function InkOverlay({
  zoom,
  strokes,
  onStrokeComplete,
  onUndo,
  penColor = "#1a1a1a",
  penSize = 8,
  fingerDrawing = false,
}: InkOverlayProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [isPencilActive, setIsPencilActive] = useState(false);
  const [selectedStrokeId, setSelectedStrokeId] = useState<string | null>(null);

  /* ── Coordinate normalization: divide by zoom for storage ── */
  const normalizeCoords = useCallback(
    (clientX: number, clientY: number): [number, number] => {
      const rect = svgRef.current!.getBoundingClientRect();
      return [(clientX - rect.left) / zoom, (clientY - rect.top) / zoom];
    },
    [zoom],
  );

  /* ── Pointer handlers with palm rejection ── */
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      // Only accept pen, or finger if explicitly enabled
      if (e.pointerType === "pen") {
        // Palm filter: contact-size + pressure floor
        if (e.pressure < 0.01 || e.width > 20 || e.height > 20) return;
      } else if (e.pointerType === "touch" && fingerDrawing) {
        // Allow finger drawing if enabled
      } else {
        return; // Reject mouse on iPad / unrecognized
      }

      if (e.button !== 0) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      setIsPencilActive(true);
      setSelectedStrokeId(null);

      const [x, y] = normalizeCoords(e.clientX, e.clientY);
      setCurrentPoints([{ x, y, pressure: e.pressure ?? 0.5, tiltX: e.tiltX, tiltY: e.tiltY }]);
    },
    [normalizeCoords, fingerDrawing],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!isPencilActive) return;
      if (e.pointerType !== "pen" && !(e.pointerType === "touch" && fingerDrawing)) return;

      const [x, y] = normalizeCoords(e.clientX, e.clientY);
      setCurrentPoints((prev) => [
        ...prev,
        { x, y, pressure: e.pressure ?? 0.5, tiltX: e.tiltX, tiltY: e.tiltY },
      ]);
    },
    [isPencilActive, normalizeCoords, fingerDrawing],
  );

  const handlePointerUp = useCallback(() => {
    setIsPencilActive(false);

    if (currentPoints.length < 3) {
      setCurrentPoints([]);
      return;
    }

    /* ── Dynamic verse linking: find nearest .verse[data-verse] ── */
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

    const newStroke: InkStroke = {
      id: `ink-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      points: currentPoints,
      color: penColor,
      size: penSize,
      linkedVerse: closestVerse,
    };

    onStrokeComplete(newStroke);
    setCurrentPoints([]);
  }, [currentPoints, penColor, penSize, zoom, onStrokeComplete]);

  const handlePointerCancel = useCallback(() => {
    setIsPencilActive(false);
    setCurrentPoints([]);
  }, []);

  /* ── Global touch suppression while Pencil is active ── */
  useEffect(() => {
    const suppress = (ev: TouchEvent) => {
      if (isPencilActive) ev.preventDefault();
    };
    if (isPencilActive) {
      document.addEventListener("touchstart", suppress, { passive: false });
      document.addEventListener("touchmove", suppress, { passive: false });
    }
    return () => {
      document.removeEventListener("touchstart", suppress);
      document.removeEventListener("touchmove", suppress);
    };
  }, [isPencilActive]);

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
        return (
          <path
            key={s.id}
            d={pathData}
            fill={s.color}
            stroke="none"
            opacity={isSelected ? 0.5 : 0.98}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedStrokeId(isSelected ? null : s.id);
            }}
            className="cursor-pointer"
            style={{ filter: isSelected ? "drop-shadow(0 0 4px hsl(var(--primary)))" : undefined }}
          />
        );
      }),
    [strokes, selectedStrokeId],
  );

  /* ── Live preview path ── */
  const livePreview = useMemo(() => {
    if (currentPoints.length < 3) return null;
    const outline = getStroke(
      currentPoints.map((p) => [p.x, p.y, p.pressure]),
      { ...STROKE_OPTIONS, size: penSize },
    );
    const pathData = getSvgPathFromStroke(outline);
    if (!pathData) return null;
    return (
      <path
        d={pathData}
        fill={penColor}
        stroke="none"
        opacity={0.7}
        style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.1))" }}
      />
    );
  }, [currentPoints, penColor, penSize]);

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 z-10"
      width="100%"
      height="100%"
      style={{
        touchAction: "none",
        cursor: isPencilActive ? "none" : "crosshair",
        pointerEvents: "auto",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      <defs>
        <filter id="ink-bleed">
          <feGaussianBlur stdDeviation="0.3" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.95" />
          </feComponentTransfer>
        </filter>
      </defs>
      {renderedStrokes}
      {livePreview}
    </svg>
  );
}
