import type { StrokeOptions } from "perfect-freehand";

export type BrushType =
  | "fine-liner"
  | "ballpoint"
  | "fountain"
  | "gel-pen"
  | "highlighter"
  | "brush-highlighter"
  | "underline"
  | "brush-pen"
  | "watercolor"
  | "calligraphy"
  | "crayon"
  | "pencil-graphite"
  | "chalk";

export interface BrushConfig {
  type: BrushType;
  label: string;
  icon: string;
  category: "writing" | "marking" | "artistic";
  size: number;
  thinning: number;
  smoothing: number;
  streamline: number;
  simulatePressure: boolean;
  start: { taper: number; cap: boolean };
  end: { taper: number; cap: boolean };
  opacity: number;
  blendMode: "normal" | "multiply" | "screen";
  textureId: string | null;
  minSize: number;
  maxSize: number;
  defaultSize: number;
  feather: number;
}

export const BRUSH_PRESETS: Record<BrushType, BrushConfig> = {
  "fine-liner": {
    type: "fine-liner",
    label: "Fine Liner",
    icon: "pen-line",
    category: "writing",
    size: 3,
    thinning: 0,
    smoothing: 0.5,
    streamline: 0.5,
    simulatePressure: false,
    start: { taper: 0, cap: true },
    end: { taper: 0, cap: true },
    opacity: 1,
    blendMode: "normal",
    textureId: null,
    minSize: 1,
    maxSize: 6,
    defaultSize: 3,
    feather: 0,
  },
  ballpoint: {
    type: "ballpoint",
    label: "Ballpoint",
    icon: "pen",
    category: "writing",
    size: 4,
    thinning: 0.2,
    smoothing: 0.4,
    streamline: 0.3,
    simulatePressure: true,
    start: { taper: 5, cap: true },
    end: { taper: 5, cap: true },
    opacity: 0.9,
    blendMode: "normal",
    textureId: null,
    minSize: 2,
    maxSize: 8,
    defaultSize: 4,
    feather: 0,
  },
  fountain: {
    type: "fountain",
    label: "Fountain Pen",
    icon: "pen-tool",
    category: "writing",
    size: 6,
    thinning: 0.6,
    smoothing: 0.6,
    streamline: 0.5,
    simulatePressure: true,
    start: { taper: 20, cap: false },
    end: { taper: 20, cap: false },
    opacity: 1,
    blendMode: "normal",
    textureId: null,
    minSize: 3,
    maxSize: 14,
    defaultSize: 6,
    feather: 0,
  },
  "gel-pen": {
    type: "gel-pen",
    label: "Gel Pen",
    icon: "circle-dot",
    category: "writing",
    size: 4,
    thinning: 0.1,
    smoothing: 0.6,
    streamline: 0.6,
    simulatePressure: true,
    start: { taper: 0, cap: true },
    end: { taper: 0, cap: true },
    opacity: 1,
    blendMode: "normal",
    textureId: null,
    minSize: 2,
    maxSize: 8,
    defaultSize: 4,
    feather: 0,
  },
  highlighter: {
    type: "highlighter",
    label: "Highlighter",
    icon: "highlighter",
    category: "marking",
    size: 20,
    thinning: 0,
    smoothing: 0.3,
    streamline: 0.2,
    simulatePressure: false,
    start: { taper: 0, cap: false },
    end: { taper: 0, cap: false },
    opacity: 0.35,
    blendMode: "multiply",
    textureId: null,
    minSize: 12,
    maxSize: 32,
    defaultSize: 20,
    feather: 0.2,
  },
  "brush-highlighter": {
    type: "brush-highlighter",
    label: "Brush Highlight",
    icon: "paintbrush",
    category: "marking",
    size: 18,
    thinning: 0.3,
    smoothing: 0.5,
    streamline: 0.3,
    simulatePressure: true,
    start: { taper: 10, cap: false },
    end: { taper: 10, cap: false },
    opacity: 0.3,
    blendMode: "multiply",
    textureId: "texture-grain-light",
    minSize: 10,
    maxSize: 30,
    defaultSize: 18,
    feather: 0.4,
  },
  underline: {
    type: "underline",
    label: "Underline",
    icon: "underline",
    category: "marking",
    size: 3,
    thinning: 0,
    smoothing: 0.2,
    streamline: 0.2,
    simulatePressure: false,
    start: { taper: 0, cap: false },
    end: { taper: 0, cap: false },
    opacity: 0.8,
    blendMode: "normal",
    textureId: null,
    minSize: 1,
    maxSize: 6,
    defaultSize: 3,
    feather: 0,
  },
  "brush-pen": {
    type: "brush-pen",
    label: "Brush Pen",
    icon: "paintbrush-vertical",
    category: "artistic",
    size: 8,
    thinning: 0.7,
    smoothing: 0.7,
    streamline: 0.5,
    simulatePressure: true,
    start: { taper: 30, cap: false },
    end: { taper: 30, cap: false },
    opacity: 1,
    blendMode: "normal",
    textureId: null,
    minSize: 3,
    maxSize: 24,
    defaultSize: 8,
    feather: 0,
  },
  watercolor: {
    type: "watercolor",
    label: "Watercolor",
    icon: "droplets",
    category: "artistic",
    size: 24,
    thinning: 0.3,
    smoothing: 0.8,
    streamline: 0.6,
    simulatePressure: true,
    start: { taper: 15, cap: false },
    end: { taper: 15, cap: false },
    opacity: 0.2,
    blendMode: "multiply",
    textureId: "texture-watercolor",
    minSize: 12,
    maxSize: 48,
    defaultSize: 24,
    feather: 0.8,
  },
  calligraphy: {
    type: "calligraphy",
    label: "Calligraphy",
    icon: "italic",
    category: "artistic",
    size: 10,
    thinning: 0.9,
    smoothing: 0.4,
    streamline: 0.3,
    simulatePressure: true,
    start: { taper: 40, cap: false },
    end: { taper: 40, cap: false },
    opacity: 1,
    blendMode: "normal",
    textureId: null,
    minSize: 4,
    maxSize: 20,
    defaultSize: 10,
    feather: 0,
  },
  crayon: {
    type: "crayon",
    label: "Crayon",
    icon: "pencil",
    category: "artistic",
    size: 12,
    thinning: 0.15,
    smoothing: 0.3,
    streamline: 0.2,
    simulatePressure: true,
    start: { taper: 0, cap: false },
    end: { taper: 0, cap: false },
    opacity: 0.7,
    blendMode: "normal",
    textureId: "texture-crayon",
    minSize: 6,
    maxSize: 20,
    defaultSize: 12,
    feather: 0.3,
  },
  "pencil-graphite": {
    type: "pencil-graphite",
    label: "Pencil",
    icon: "pencil",
    category: "artistic",
    size: 4,
    thinning: 0.3,
    smoothing: 0.4,
    streamline: 0.4,
    simulatePressure: true,
    start: { taper: 10, cap: false },
    end: { taper: 10, cap: false },
    opacity: 0.6,
    blendMode: "normal",
    textureId: "texture-graphite",
    minSize: 1,
    maxSize: 8,
    defaultSize: 4,
    feather: 0.1,
  },
  chalk: {
    type: "chalk",
    label: "Chalk",
    icon: "minus",
    category: "artistic",
    size: 16,
    thinning: 0.2,
    smoothing: 0.5,
    streamline: 0.3,
    simulatePressure: true,
    start: { taper: 5, cap: false },
    end: { taper: 5, cap: false },
    opacity: 0.5,
    blendMode: "screen",
    textureId: "texture-chalk",
    minSize: 8,
    maxSize: 30,
    defaultSize: 16,
    feather: 0.5,
  },
};

/** Convert a BrushConfig + size override into perfect-freehand StrokeOptions */
export function getBrushStrokeOptions(config: BrushConfig, size?: number): StrokeOptions {
  return {
    size: size ?? config.size,
    thinning: config.thinning,
    smoothing: config.smoothing,
    streamline: config.streamline,
    simulatePressure: config.simulatePressure,
    start: { taper: config.start.taper, easing: (t: number) => t * t },
    end: { taper: config.end.taper, easing: (t: number) => t },
  };
}

/** Get brushes by category */
export function getBrushesByCategory(category: BrushConfig["category"]): BrushConfig[] {
  return Object.values(BRUSH_PRESETS).filter((b) => b.category === category);
}

/** Resolve a brush type (with fallback for backward compat) */
export function resolveBrush(type?: BrushType | string): BrushConfig {
  if (type && type in BRUSH_PRESETS) return BRUSH_PRESETS[type as BrushType];
  return BRUSH_PRESETS.ballpoint;
}
