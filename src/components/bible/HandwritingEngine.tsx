import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { getStroke, StrokeOptions } from 'perfect-freehand';

export type Point = {
  x: number;
  y: number;
  pressure: number;
  tiltX?: number;
  tiltY?: number;
  twist?: number;
};

export type StrokeData = {
  id: string;
  points: Point[];
  color: string;
  size: number;
};

export type HandwritingEngineHandle = {
  clear: () => void;
  undo: () => void;
  getStrokes: () => StrokeData[];
  getSVG: () => string;
  exportForPencilKit: () => any;
};

interface HandwritingEngineProps {
  width?: number | string;
  height?: number | string;
  variant?: 'margin' | 'infinite' | 'journal';
  initialStrokes?: StrokeData[];
  onSave?: (strokes: StrokeData[]) => void;
  onChange?: (strokes: StrokeData[]) => void;
  defaultColor?: string;
  defaultSize?: number;
  showToolbar?: boolean;
  className?: string;
}

const getSvgPathFromStroke = (stroke: number[][], closed = true): string => {
  const len = stroke.length;
  if (len < 4) return '';

  const average = (a: number, b: number) => (a + b) / 2;

  let d = '';
  let a = stroke[0];
  let b = stroke[1];
  const c = stroke[2];

  d += `M ${a[0].toFixed(2)},${a[1].toFixed(2)} Q ${b[0].toFixed(2)},${b[1].toFixed(2)} ${average(b[0], c[0]).toFixed(2)},${average(b[1], c[1]).toFixed(2)} T`;

  for (let i = 2; i < len - 1; i++) {
    a = stroke[i];
    b = stroke[i + 1];
    d += `${average(a[0], b[0]).toFixed(2)},${average(a[1], b[1]).toFixed(2)} `;
  }

  if (closed) d += 'Z';
  return d;
};

const defaultOptions: StrokeOptions = {
  size: 8,
  thinning: 0.65,
  smoothing: 0.65,
  streamline: 0.65,
  simulatePressure: false,
  start: { taper: 0, easing: (t) => t },
  end: { taper: 0, easing: (t) => t },
};

export const HandwritingEngine = forwardRef<HandwritingEngineHandle, HandwritingEngineProps>(
  (
    {
      width = '100%',
      height = '100%',
      variant = 'margin',
      initialStrokes = [],
      onSave,
      onChange,
      defaultColor = '#1a1a1a',
      defaultSize = 8,
      showToolbar = true,
      className = '',
    },
    ref,
  ) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [strokes, setStrokes] = useState<StrokeData[]>(initialStrokes);
    const [livePoints, setLivePoints] = useState<Point[]>([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentColor, setCurrentColor] = useState(defaultColor);
    const [currentSize, setCurrentSize] = useState(defaultSize);
    const [pointerType, setPointerType] = useState<'pen' | 'mouse' | 'touch'>('mouse');

    const isPen = useCallback((e: React.PointerEvent) => e.pointerType === 'pen', []);

    const getRelativePoint = useCallback(
      (e: React.PointerEvent<SVGSVGElement>): Point => {
        const rect = svgRef.current!.getBoundingClientRect();
        return {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          pressure: e.pressure ?? (isPen(e) ? 0.85 : 0.5),
          tiltX: e.tiltX,
          tiltY: e.tiltY,
          twist: (e as any).twist ?? 0,
        };
      },
      [isPen],
    );

    const handlePointerDown = useCallback(
      (e: React.PointerEvent<SVGSVGElement>) => {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        setIsDrawing(true);
        setPointerType(e.pointerType as any);
        setLivePoints([getRelativePoint(e)]);
        if (isPen(e)) console.log('🍎 Apple Pencil detected');
      },
      [getRelativePoint, isPen],
    );

    const handlePointerMove = useCallback(
      (e: React.PointerEvent<SVGSVGElement>) => {
        if (!isDrawing || e.buttons !== 1) return;
        setLivePoints((prev) => [...prev, getRelativePoint(e)]);
      },
      [isDrawing, getRelativePoint],
    );

    const finishStroke = useCallback(() => {
      if (livePoints.length < 2) {
        setLivePoints([]);
        setIsDrawing(false);
        return;
      }

      const newStroke: StrokeData = {
        id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        points: livePoints,
        color: currentColor,
        size: currentSize,
      };

      const updated = [...strokes, newStroke];
      setStrokes(updated);
      setLivePoints([]);
      setIsDrawing(false);
      onChange?.(updated);
      onSave?.(updated);
    }, [livePoints, currentColor, currentSize, strokes, onChange, onSave]);

    const handlePointerUp = useCallback(() => finishStroke(), [finishStroke]);

    const undo = useCallback(() => {
      const updated = strokes.slice(0, -1);
      setStrokes(updated);
      onChange?.(updated);
    }, [strokes, onChange]);

    const clear = useCallback(() => {
      setStrokes([]);
      onChange?.([]);
    }, [onChange]);

    useEffect(() => {
      const handleKey = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
          e.preventDefault();
          undo();
        }
      };
      window.addEventListener('keydown', handleKey);
      return () => window.removeEventListener('keydown', handleKey);
    }, [undo]);

    useImperativeHandle(ref, () => ({
      clear,
      undo,
      getStrokes: () => strokes,
      getSVG: () =>
        svgRef.current ? new XMLSerializer().serializeToString(svgRef.current) : '',
      exportForPencilKit: () => ({
        version: '1.0',
        strokes: strokes.map((s) => ({
          id: s.id,
          points: s.points,
          color: s.color,
          size: s.size,
        })),
      }),
    }));

    const liveStroke = React.useMemo(() => {
      if (livePoints.length < 2) return null;
      const outline = getStroke(
        livePoints.map((p) => [p.x, p.y, p.pressure]),
        { ...defaultOptions, size: currentSize },
      );
      const pathData = getSvgPathFromStroke(outline);
      return pathData ? (
        <path
          d={pathData}
          fill={currentColor}
          stroke="none"
          style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }}
        />
      ) : null;
    }, [livePoints, currentColor, currentSize]);

    const renderedStrokes = React.useMemo(
      () =>
        strokes.map((stroke) => {
          const outline = getStroke(
            stroke.points.map((p) => [p.x, p.y, p.pressure]),
            { ...defaultOptions, size: stroke.size },
          );
          const pathData = getSvgPathFromStroke(outline);
          return pathData ? (
            <path key={stroke.id} d={pathData} fill={stroke.color} stroke="none" opacity={0.98} />
          ) : null;
        }),
      [strokes],
    );

    return (
      <div
        className={`handwriting-engine relative overflow-hidden border border-dashed border-amber-300/30 rounded-2xl bg-[#faf8f0] ${className}`}
        style={{
          width,
          height,
          boxShadow:
            variant === 'journal'
              ? '0 25px 50px -12px rgb(0 0 0 / 0.15)'
              : 'inset 0 0 60px -20px rgb(234 179 8 / 0.2)',
        }}
      >
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={`0 0 ${typeof width === 'number' ? width : 800} ${typeof height === 'number' ? height : 600}`}
          style={{ touchAction: 'none', cursor: isDrawing ? 'none' : 'crosshair' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {renderedStrokes}
          {liveStroke}
          {variant === 'margin' && (
            <rect
              width="100%"
              height="100%"
              fill="url(#paperTexture)"
              opacity="0.04"
              pointerEvents="none"
            />
          )}
          <defs>
            <pattern
              id="paperTexture"
              patternUnits="userSpaceOnUse"
              width="4"
              height="4"
              patternTransform="rotate(12)"
            >
              <path d="M0 0 L4 0" stroke="#000" strokeWidth="0.5" opacity="0.15" />
            </pattern>
          </defs>
        </svg>

        {showToolbar && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/90 backdrop-blur-md shadow-xl border border-amber-200 rounded-3xl px-4 py-2 z-10">
            {['#1a1a1a', '#9c0f0f', '#0f4d9c', '#0f9c4d', '#9c6f0f'].map((color) => (
              <button
                key={color}
                onClick={() => setCurrentColor(color)}
                className={`w-8 h-8 rounded-2xl transition-all hover:scale-110 ${
                  currentColor === color ? 'ring-2 ring-offset-2 ring-amber-400' : ''
                }`}
                style={{ backgroundColor: color }}
              />
            ))}

            <div className="flex items-center gap-3 px-4 border-l border-r border-amber-200">
              <span className="text-xs text-amber-700 font-medium">SIZE</span>
              <input
                type="range"
                min="4"
                max="32"
                step="1"
                value={currentSize}
                onChange={(e) => setCurrentSize(Number(e.target.value))}
                className="w-24 accent-amber-500"
              />
              <span className="text-xs font-mono text-amber-700 w-6">{currentSize}</span>
            </div>

            <button
              onClick={undo}
              disabled={strokes.length === 0}
              className="flex items-center justify-center w-9 h-9 hover:bg-amber-100 rounded-2xl text-amber-700 disabled:opacity-30"
            >
              ↩
            </button>
            <button
              onClick={clear}
              className="flex items-center justify-center w-9 h-9 hover:bg-red-100 rounded-2xl text-red-600"
            >
              🗑
            </button>

            {pointerType === 'pen' && (
              <div className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-100 px-3 h-8 rounded-2xl">
                🍎 Pencil
              </div>
            )}
          </div>
        )}
      </div>
    );
  },
);

HandwritingEngine.displayName = 'HandwritingEngine';
