/**
 * usePencilTools.ts — Zustand store for all pencil/brush state
 * 
 * REPLACES: Tool state previously inlined in iPadStudyToolbar.tsx (416 lines)
 * CONSUMED BY: StudioToolbar, GhostToolbar, InkOverlay.tsx, MarginAnnotationLayer.tsx
 * 
 * State lives outside React tree so it persists across route changes and
 * toolbar unmounts. InkOverlay reads activeTool + brushStyle to choose
 * perfect-freehand options and SVG filter IDs at stroke time.
 * 
 * iPadOS: Map brush selection to PKInkingTool(.pen, .marker, .pencil)
 *         Map color to PKInkingTool.color (UIColor)
 *         Map size to PKInkingTool.width
 *         Squeeze → UIPencilInteraction.preferredToolPicker
 *         Barrel roll → brushAngle (custom property on stroke metadata)
 *         Double-tap → toggleLastTool via UIPencilInteraction delegate
 */

import { create } from 'zustand';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ToolType = 'pen' | 'highlighter' | 'eraser' | 'lasso';

export type BrushStyle = 'fountain' | 'technical' | 'wash' | 'marker';

export type MarginRule = 'none' | 'dots' | 'lines';

/** Maps BrushStyle → SVG filter ID defined in InkFilterDefs.tsx */
export const BRUSH_FILTER_MAP: Record<BrushStyle, string> = {
  fountain: 'kr-fountain',
  technical: 'kr-technical',
  wash: 'kr-wash',
  marker: 'kr-marker',
};

/** Filter for highlighter tool (regardless of brushStyle) */
export const HIGHLIGHTER_FILTER = 'kr-highlighter';

/** Returns the SVG filter ID for current tool + brush combo */
export function getActiveFilterId(tool: ToolType, brush: BrushStyle): string {
  if (tool === 'highlighter') return HIGHLIGHTER_FILTER;
  if (tool === 'eraser' || tool === 'lasso') return ''; // no filter
  return BRUSH_FILTER_MAP[brush] ?? BRUSH_FILTER_MAP.fountain;
}

/** 
 * Returns perfect-freehand options based on brush style.
 * Wire into InkOverlay.tsx where getStroke() is called.
 */
export function getBrushStrokeOptions(brush: BrushStyle, size: number, pressure: number) {
  const base = {
    size: size,
    smoothing: 0.5,
    thinning: 0.5,
    streamline: 0.5,
    simulatePressure: false,
  };

  switch (brush) {
    case 'fountain':
      return { ...base, thinning: 0.6, smoothing: 0.5, streamline: 0.4 };
    case 'technical':
      return { ...base, thinning: 0.05, smoothing: 0.8, streamline: 0.9, size: size * 0.7 };
    case 'wash':
      return { ...base, thinning: 0.3, smoothing: 0.3, streamline: 0.2, size: size * 4 };
    case 'marker':
      return { ...base, thinning: 0.15, smoothing: 0.4, streamline: 0.5, size: size * 2 };
    default:
      return base;
  }
}

// ─── Store ───────────────────────────────────────────────────────────────────

interface PencilToolsState {
  // Active selections
  activeTool: ToolType;
  previousTool: ToolType; // for double-tap toggle
  brushStyle: BrushStyle;

  // Brush properties
  color: string;
  size: number;        // px, 0.5–12
  opacity: number;     // 0.1–1.0
  smoothing: number;   // 0–1 (maps to perfect-freehand smoothing)

  // Color history
  recentColors: string[];

  // Margin mode
  marginRule: MarginRule;

  // Squeeze menu state
  isSqueezeMenuOpen: boolean;
  squeezePosition: { x: number; y: number };

  // Actions
  setTool: (tool: ToolType) => void;
  toggleLastTool: () => void;
  setBrushStyle: (style: BrushStyle) => void;
  setColor: (color: string) => void;
  setSize: (size: number) => void;
  setOpacity: (opacity: number) => void;
  setSmoothing: (smoothing: number) => void;
  setMarginRule: (rule: MarginRule) => void;
  openSqueezeMenu: (x: number, y: number) => void;
  closeSqueezeMenu: () => void;
  toggleSqueezeMenu: (x: number, y: number) => void;
}

export const usePencilTools = create<PencilToolsState>((set, get) => ({
  activeTool: 'pen',
  previousTool: 'pen',
  brushStyle: 'fountain',
  color: '#1a1a1a',
  size: 2,
  opacity: 1,
  smoothing: 0.5,
  recentColors: ['#1a1a1a', '#c0392b', '#2980b9', '#27ae60', '#8e44ad'],
  marginRule: 'none',
  isSqueezeMenuOpen: false,
  squeezePosition: { x: 0, y: 0 },

  setTool: (tool) =>
    set((s) => ({
      activeTool: tool,
      previousTool: s.activeTool !== tool ? s.activeTool : s.previousTool,
    })),

  /** Double-tap toggle: swaps between current and previous tool.
   *  iPadOS: Wire to UIPencilInteraction.didReceiveDoubleTap */
  toggleLastTool: () =>
    set((s) => ({
      activeTool: s.previousTool,
      previousTool: s.activeTool,
    })),

  setBrushStyle: (style) => set({ brushStyle: style }),

  setColor: (color) =>
    set((s) => ({
      color,
      recentColors: [color, ...s.recentColors.filter((c) => c !== color)].slice(0, 5),
    })),

  setSize: (size) => set({ size: Math.max(0.5, Math.min(12, size)) }),
  setOpacity: (opacity) => set({ opacity: Math.max(0.1, Math.min(1, opacity)) }),
  setSmoothing: (smoothing) => set({ smoothing: Math.max(0, Math.min(1, smoothing)) }),
  setMarginRule: (rule) => set({ marginRule: rule }),

  openSqueezeMenu: (x, y) =>
    set({ isSqueezeMenuOpen: true, squeezePosition: { x, y } }),

  closeSqueezeMenu: () => set({ isSqueezeMenuOpen: false }),

  toggleSqueezeMenu: (x, y) =>
    set((s) => ({
      isSqueezeMenuOpen: !s.isSqueezeMenuOpen,
      squeezePosition: { x, y },
    })),
}));
