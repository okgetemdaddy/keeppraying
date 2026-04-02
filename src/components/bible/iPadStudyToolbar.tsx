import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Undo2,
  Redo2,
  Eraser,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  Mic,
  MousePointer2,
  Trash2,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";

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

interface IPadStudyToolbarProps {
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

export function IPadStudyToolbar({
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
}: IPadStudyToolbarProps) {
  const PEN_COLORS = isDark ? PEN_COLORS_DARK : PEN_COLORS_LIGHT;
  const [expanded, setExpanded] = useState(true);
  const [leftExpanded, setLeftExpanded] = useState(false);
  const [rightExpanded, setRightExpanded] = useState(false);

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 bg-card/90 backdrop-blur-md border border-border rounded-full px-4 py-2 shadow-xl text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        ✏️ Ink Tools
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2 max-w-[95vw] transition-opacity duration-150"
      style={{ opacity: isPencilActive ? 0 : 1, pointerEvents: isPencilActive ? "none" : "auto" }}
    >
      {/* Main toolbar pill */}
      <div className="flex items-center gap-0 bg-card/95 backdrop-blur-md shadow-xl border border-border rounded-3xl overflow-hidden">

        {/* ─── Left chevron: Selection tools ─── */}
        <AnimatePresence>
          {leftExpanded && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "auto", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
              className="flex items-center gap-1 overflow-hidden"
            >
              <div className="flex items-center gap-1 pl-2">
                {/* Finger toggle */}
                <button
                  onClick={() => onFingerDrawingChange(!fingerDrawing)}
                  className={`flex items-center justify-center w-8 h-8 rounded-xl text-xs transition-colors ${
                    fingerDrawing
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                  title={fingerDrawing ? "Finger drawing ON" : "Pencil only"}
                >
                  👆
                </button>
              </div>
              <div className="w-px h-6 bg-border" />
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => { setLeftExpanded(!leftExpanded); if (!leftExpanded) setRightExpanded(false); }}
          className="flex items-center justify-center w-8 h-8 text-muted-foreground hover:text-foreground transition-colors shrink-0"
          title="Selection tools"
        >
          <ChevronLeft className={`h-3.5 w-3.5 transition-transform ${leftExpanded ? "rotate-180" : ""}`} />
        </button>

        {/* ─── Core tools ─── */}
        <div className="flex items-center gap-1.5 px-2 py-2">
          {/* Color picker */}
          {PEN_COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => onPenColorChange(c.value)}
              className={`w-7 h-7 rounded-full transition-all hover:scale-110 shrink-0 ${
                penColor === c.value ? "ring-2 ring-offset-2 ring-primary" : ""
              } ${isDark ? "border border-white/20" : ""}`}
              style={{ backgroundColor: c.value }}
              title={c.label}
            />
          ))}

          <div className="w-px h-6 bg-border mx-0.5" />

          {/* Size slider */}
          <div className="flex items-center gap-1.5 px-1">
            <span className="text-[0.6rem] text-muted-foreground font-medium uppercase">Size</span>
            <Slider
              value={[penSize]}
              min={4}
              max={32}
              step={1}
              onValueChange={([v]) => onPenSizeChange(v)}
              className="w-16"
            />
            <span className="text-[0.6rem] font-mono text-muted-foreground w-4 text-right">{penSize}</span>
          </div>

          <div className="w-px h-6 bg-border mx-0.5" />

          {/* Undo */}
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="flex items-center justify-center w-8 h-8 hover:bg-muted rounded-xl text-muted-foreground disabled:opacity-30 transition-colors"
            title="Undo (⌘Z)"
          >
            <Undo2 className="h-4 w-4" />
          </button>

          {/* Redo */}
          {onRedo && (
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="flex items-center justify-center w-8 h-8 hover:bg-muted rounded-xl text-muted-foreground disabled:opacity-30 transition-colors"
              title="Redo (⌘⇧Z)"
            >
              <Redo2 className="h-4 w-4" />
            </button>
          )}

          {/* Clear */}
          <button
            onClick={onClear}
            className="flex items-center justify-center w-8 h-8 hover:bg-destructive/10 rounded-xl text-destructive/70 transition-colors"
            title="Clear all ink"
          >
            <Eraser className="h-4 w-4" />
          </button>
        </div>

        {/* ─── Right chevron: Eraser + Mic ─── */}
        <button
          onClick={() => { setRightExpanded(!rightExpanded); if (!rightExpanded) setLeftExpanded(false); }}
          className="flex items-center justify-center w-8 h-8 text-muted-foreground hover:text-foreground transition-colors shrink-0"
          title="More tools"
        >
          <ChevronRight className={`h-3.5 w-3.5 transition-transform ${rightExpanded ? "rotate-180" : ""}`} />
        </button>

        <AnimatePresence>
          {rightExpanded && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "auto", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
              className="flex items-center gap-1 overflow-hidden"
            >
              <div className="w-px h-6 bg-border" />
              <div className="flex items-center gap-1 pr-2">
                {/* Trash bin */}
                {onOpenTrash && (
                  <button
                    onClick={onOpenTrash}
                    className={`flex items-center justify-center w-8 h-8 rounded-xl transition-colors ${
                      hasTrashItems
                        ? "text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                    title="Ink trash bin"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}

                {/* Voice note */}
                {onOpenVoice && (
                  <button
                    onClick={onOpenVoice}
                    className="flex items-center justify-center w-8 h-8 rounded-xl text-muted-foreground hover:bg-muted hover:text-primary transition-colors"
                    title="Voice note"
                  >
                    <Mic className="h-4 w-4" />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapse */}
        <button
          onClick={() => setExpanded(false)}
          className="flex items-center justify-center w-8 h-8 hover:bg-muted rounded-r-3xl text-muted-foreground transition-colors text-xs shrink-0"
          title="Minimize toolbar"
        >
          ▾
        </button>
      </div>

      {/* Secondary row: zoom + spacing */}
      <div className="flex items-center gap-3 bg-card/90 backdrop-blur-md shadow-lg border border-border rounded-2xl px-3 py-1.5 text-xs">
        <div className="flex items-center gap-1.5">
          <ZoomIn className="h-3.5 w-3.5 text-muted-foreground" />
          <Slider
            value={[zoom]}
            min={1}
            max={5}
            step={0.25}
            onValueChange={([v]) => onZoomChange(v)}
            className="w-20"
          />
          <span className="text-[0.6rem] font-mono text-muted-foreground w-6">{zoom.toFixed(1)}×</span>
        </div>

        <div className="w-px h-5 bg-border" />

        <div className="flex items-center gap-1.5">
          <span className="text-[0.6rem] text-muted-foreground font-medium">Spacing</span>
          <Slider
            value={[textSpacing]}
            min={1}
            max={4}
            step={0.2}
            onValueChange={([v]) => onTextSpacingChange(v)}
            className="w-20"
          />
          <span className="text-[0.6rem] font-mono text-muted-foreground w-6">{textSpacing.toFixed(1)}×</span>
        </div>
      </div>
    </div>
  );
}
