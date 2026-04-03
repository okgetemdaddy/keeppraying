import React, { useRef, useCallback } from "react";

export interface InkStroke {
  points: [number, number][];
}

interface InkCanvasProps {
  strokes: InkStroke[];
  drawMode: boolean;
  onStrokeStart: () => void;
  onStrokePoint: (pt: [number, number]) => void;
  onStrokeEnd: () => void;
}

/**
 * InkCanvas — SVG drawing layer.
 *
 * Sits as an absolutely-positioned sibling to the text column inside the
 * panning container, so ink and text move together with zero jitter.
 *
 * Uses svg.getScreenCTM().inverse() to transform screen coords into
 * SVG-local space — ink stays anchored regardless of pan/zoom.
 *
 * CRITICAL: Only captures pointer events when drawMode is true.
 * The parent ZoomPanWrapper handles the two-finger pan gate separately.
 */
const InkCanvas: React.FC<InkCanvasProps> = ({
  strokes,
  drawMode,
  onStrokeStart,
  onStrokePoint,
  onStrokeEnd,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const drawing = useRef(false);

  const toSVGPoint = useCallback(
    (clientX: number, clientY: number): [number, number] | null => {
      const svg = svgRef.current;
      if (!svg) return null;
      const ctm = svg.getScreenCTM();
      if (!ctm) return null;
      const inv = ctm.inverse();
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const transformed = pt.matrixTransform(inv);
      return [transformed.x, transformed.y];
    },
    []
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!drawMode) return;
      // Only capture single-pointer (pen or mouse) for drawing
      if (e.pointerType === "touch") return; // touch goes to pan
      e.preventDefault();
      e.stopPropagation();
      (e.target as Element).setPointerCapture(e.pointerId);
      drawing.current = true;
      onStrokeStart();
      const pt = toSVGPoint(e.clientX, e.clientY);
      if (pt) onStrokePoint(pt);
    },
    [drawMode, onStrokeStart, onStrokePoint, toSVGPoint]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!drawing.current) return;
      e.preventDefault();
      e.stopPropagation();
      const pt = toSVGPoint(e.clientX, e.clientY);
      if (pt) onStrokePoint(pt);
    },
    [onStrokePoint, toSVGPoint]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!drawing.current) return;
      e.preventDefault();
      drawing.current = false;
      onStrokeEnd();
    },
    [onStrokeEnd]
  );

  return (
    <svg
      ref={svgRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        // Only intercept pointer events in draw mode, and only for non-touch
        pointerEvents: drawMode ? "auto" : "none",
        touchAction: "none",
        zIndex: 10,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {strokes.map((stroke, i) => {
        if (stroke.points.length < 2) return null;
        const d = stroke.points
          .map((p, j) => `${j === 0 ? "M" : "L"}${p[0]},${p[1]}`)
          .join(" ");
        return (
          <path
            key={i}
            d={d}
            fill="none"
            stroke="#1a1410"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.8}
          />
        );
      })}
    </svg>
  );
};

export default InkCanvas;
