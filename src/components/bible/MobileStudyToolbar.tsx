import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Undo2,
  Redo2,
  Eraser,
  ZoomIn,
  Mic,
  Trash2,
  MoreHorizontal,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer";

const PEN_COLORS_LIGHT = [
  { value: "#1A1A1A", label: "Iron Gall Black" },
  { value: "#4A0E0E", label: "Oxblood Red" },
  { value: "#0f4d9c", label: "Royal Blue" },
  { value: "#0f9c4d", label: "Forest Green" },
  { value: "#D4C4A8", label: "Sepia Highlighter" },
];

const PEN_COLORS_DARK = [
  { value: "#E8E4DF", label: "Parchment White" },
  { value: "#C44040", label: "Bright Red" },
  { value: "#5B9BD5", label: "Sky Blue" },
  { value: "#5BC48A", label: "Mint Green" },
  { value: "#D4C4A8", label: "Sepia Highlighter" },
];

const NEON_COLORS = [
  { core: "#E0FFFF", bloom: "#00FFFF", label: "Electric Cyan", bg: "#0a1a1a" },
  { core: "#FFD8FF", bloom: "#FF00FF", label: "Neon Fuchsia", bg: "#1a0a1a" },
  { core: "#EAFFEA", bloom: "#39FF14", label: "Radiant Lime", bg: "#0a1a0a" },
];

const SIZE_PRESETS = [
  { label: "S", size: 4 },
  { label: "M", size: 12 },
  { label: "L", size: 24 },
] as const;

interface MobileStudyToolbarProps {
  penColor: string;
  onPenColorChange: (color: string) => void;
  penSize: number;
  onPenSizeChange: (size: number) => void;
  penGlow?: string | null;
  onPenGlowChange?: (glow: string | null) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  textSpacing: number;
  onTextSpacingChange: (spacing: number) => void;
  onUndo: () => void;
  onRedo?: () => void;
  onClear: () => void;
  canUndo: boolean;
  canRedo?: boolean;
  fingerDrawing: boolean;
  onFingerDrawingChange: (v: boolean) => void;
  isPencilActive?: boolean;
  isDark?: boolean;
  onOpenTrash?: () => void;
  onOpenVoice?: () => void;
  hasTrashItems?: boolean;
}

function closestPreset(size: number): string {
  let best = SIZE_PRESETS[0];
  for (const p of SIZE_PRESETS) {
    if (Math.abs(p.size - size) < Math.abs(best.size - size)) best = p;
  }
  return best.label;
}

export function MobileStudyToolbar({
  penColor,
  onPenColorChange,
  penSize,
  onPenSizeChange,
  penGlow,
  onPenGlowChange,
  zoom,
  onZoomChange,
  textSpacing,
  onTextSpacingChange,
  onUndo,
  onRedo,
  onClear,
  canUndo,
  canRedo = false,
  fingerDrawing,
  onFingerDrawingChange,
  isPencilActive = false,
  isDark = false,
  onOpenTrash,
  onOpenVoice,
  hasTrashItems = false,
}: MobileStudyToolbarProps) {
  const PEN_COLORS = isDark ? PEN_COLORS_DARK : PEN_COLORS_LIGHT;
  const [expanded, setExpanded] = useState(true);
  const activePreset = closestPreset(penSize);

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="fixed bottom-28 left-1/2 -translate-x-1/2 z-40 bg-card/90 backdrop-blur-md border border-border rounded-full px-4 py-2 shadow-xl text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        ✏️ Ink
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-28 left-2 right-2 z-40 transition-opacity duration-150"
      style={{ opacity: isPencilActive ? 0 : 1, pointerEvents: isPencilActive ? "none" : "auto" }}
    >
      <div className="flex items-center gap-1 bg-card/95 backdrop-blur-md shadow-xl border border-border rounded-2xl px-2 py-1.5">
        {/* ─── Color dots ─── */}
        <div className="flex items-center gap-1">
          {PEN_COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => { onPenColorChange(c.value); onPenGlowChange?.(null); }}
              className={`w-6 h-6 rounded-full transition-all shrink-0 ${
                penColor === c.value && !penGlow ? "ring-2 ring-offset-1 ring-primary" : ""
              } ${isDark ? "border border-white/20" : ""}`}
              style={{ backgroundColor: c.value }}
              title={c.label}
            />
          ))}
        </div>

        <div className="w-px h-5 bg-border shrink-0" />

        {/* ─── Size presets ─── */}
        <div className="flex items-center gap-0.5">
          {SIZE_PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => onPenSizeChange(p.size)}
              className={`w-7 h-7 rounded-lg text-[0.6rem] font-bold transition-colors ${
                activePreset === p.label
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-border shrink-0" />

        {/* ─── Undo / Redo / Clear ─── */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="flex items-center justify-center w-7 h-7 hover:bg-muted rounded-lg text-muted-foreground disabled:opacity-30 transition-colors"
          title="Undo"
        >
          <Undo2 className="h-3.5 w-3.5" />
        </button>
        {onRedo && (
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="flex items-center justify-center w-7 h-7 hover:bg-muted rounded-lg text-muted-foreground disabled:opacity-30 transition-colors"
            title="Redo"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={onClear}
          className="flex items-center justify-center w-7 h-7 hover:bg-destructive/10 rounded-lg text-destructive/70 transition-colors"
          title="Clear ink"
        >
          <Eraser className="h-3.5 w-3.5" />
        </button>

        <div className="flex-1" />

        {/* ─── Overflow drawer trigger ─── */}
        <Drawer>
          <DrawerTrigger asChild>
            <button className="flex items-center justify-center w-7 h-7 hover:bg-muted rounded-lg text-muted-foreground transition-colors">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DrawerTrigger>
          <DrawerContent className="px-4 pb-8 pt-4">
            <div className="flex flex-col gap-5">
              <h3 className="text-sm font-semibold text-foreground">More Tools</h3>

              {/* Neon glow inks */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-muted-foreground">Glow Inks</span>
                <div className="flex items-center gap-2">
                  {NEON_COLORS.map((n) => (
                    <button
                      key={n.bloom}
                      onClick={() => { onPenColorChange(n.core); onPenGlowChange?.(n.bloom); }}
                      className={`relative w-9 h-9 rounded-full transition-all ${
                        penGlow === n.bloom ? "ring-2 ring-offset-1 ring-white/60" : ""
                      }`}
                      style={{
                        backgroundColor: n.bg,
                        boxShadow: `0 0 8px 2px ${n.bloom}80, inset 0 0 6px 1px ${n.bloom}60`,
                      }}
                      title={n.label}
                    >
                      <span
                        className="absolute inset-1.5 rounded-full"
                        style={{ backgroundColor: n.core, boxShadow: `0 0 4px 1px ${n.bloom}` }}
                      />
                    </button>
                  ))}
                  {penGlow && (
                    <button
                      onClick={() => onPenGlowChange?.(null)}
                      className="text-xs text-muted-foreground underline ml-2"
                    >
                      Clear glow
                    </button>
                  )}
                </div>
              </div>

              {/* Finger drawing toggle */}
              <button
                onClick={() => onFingerDrawingChange(!fingerDrawing)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors ${
                  fingerDrawing
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <span className="text-base">👆</span>
                <span>{fingerDrawing ? "Finger drawing ON" : "Pencil only (tap to enable finger)"}</span>
              </button>

              {/* Zoom */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-muted-foreground">Zoom</span>
                <div className="flex items-center gap-2">
                  <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Slider
                    value={[zoom]}
                    min={1}
                    max={5}
                    step={0.25}
                    onValueChange={([v]) => onZoomChange(v)}
                    className="flex-1"
                  />
                  <span className="text-xs font-mono text-muted-foreground w-8 text-right">{zoom.toFixed(1)}×</span>
                </div>
              </div>

              {/* Spacing */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-muted-foreground">Line Spacing</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground shrink-0">Aa</span>
                  <Slider
                    value={[textSpacing]}
                    min={1}
                    max={4}
                    step={0.2}
                    onValueChange={([v]) => onTextSpacingChange(v)}
                    className="flex-1"
                  />
                  <span className="text-xs font-mono text-muted-foreground w-8 text-right">{textSpacing.toFixed(1)}×</span>
                </div>
              </div>

              {/* Trash & Voice */}
              <div className="flex items-center gap-2">
                {onOpenTrash && (
                  <button
                    onClick={onOpenTrash}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors ${
                      hasTrashItems
                        ? "text-amber-600 bg-amber-50 dark:bg-amber-900/20"
                        : "text-muted-foreground bg-muted"
                    }`}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Ink Trash</span>
                  </button>
                )}
                {onOpenVoice && (
                  <button
                    onClick={onOpenVoice}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground bg-muted hover:text-primary transition-colors"
                  >
                    <Mic className="h-4 w-4" />
                    <span>Voice Note</span>
                  </button>
                )}
              </div>
            </div>
          </DrawerContent>
        </Drawer>

        {/* ─── Collapse ─── */}
        <button
          onClick={() => setExpanded(false)}
          className="flex items-center justify-center w-7 h-7 hover:bg-muted rounded-lg text-muted-foreground transition-colors text-xs shrink-0"
          title="Minimize"
        >
          ▾
        </button>
      </div>
    </div>
  );
}
