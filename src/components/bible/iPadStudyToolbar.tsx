import React, { useState } from "react";
import { Undo2, Eraser, ZoomIn, Space } from "lucide-react";
import { Slider } from "@/components/ui/slider";

const PEN_COLORS = [
  { value: "#1A1A1A", label: "Iron Gall Black" },
  { value: "#4A0E0E", label: "Oxblood Red" },
  { value: "#0f4d9c", label: "Royal Blue" },
  { value: "#0f9c4d", label: "Forest Green" },
  { value: "#D4C4A8", label: "Sepia Highlighter" },
];

interface IPadStudyToolbarProps {
  penColor: string;
  onPenColorChange: (color: string) => void;
  penSize: number;
  onPenSizeChange: (size: number) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  textSpacing: number;
  onTextSpacingChange: (spacing: number) => void;
  onUndo: () => void;
  onClear: () => void;
  canUndo: boolean;
  fingerDrawing: boolean;
  onFingerDrawingChange: (v: boolean) => void;
  isPencilActive?: boolean;
}

export function IPadStudyToolbar({
  penColor,
  onPenColorChange,
  penSize,
  onPenSizeChange,
  zoom,
  onZoomChange,
  textSpacing,
  onTextSpacingChange,
  onUndo,
  onClear,
  canUndo,
  fingerDrawing,
  onFingerDrawingChange,
  isPencilActive = false,
}: IPadStudyToolbarProps) {
  const [expanded, setExpanded] = useState(true);

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
      <div className="flex items-center gap-1.5 bg-card/95 backdrop-blur-md shadow-xl border border-border rounded-3xl px-3 py-2">
        {/* Color picker */}
        {PEN_COLORS.map((c) => (
          <button
            key={c.value}
            onClick={() => onPenColorChange(c.value)}
            className={`w-7 h-7 rounded-full transition-all hover:scale-110 shrink-0 ${
              penColor === c.value ? "ring-2 ring-offset-2 ring-primary" : ""
            }`}
            style={{ backgroundColor: c.value }}
            title={c.label}
          />
        ))}

        {/* Divider */}
        <div className="w-px h-6 bg-border mx-1" />

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

        {/* Divider */}
        <div className="w-px h-6 bg-border mx-1" />

        {/* Undo */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="flex items-center justify-center w-8 h-8 hover:bg-muted rounded-xl text-muted-foreground disabled:opacity-30 transition-colors"
          title="Undo (⌘Z)"
        >
          <Undo2 className="h-4 w-4" />
        </button>

        {/* Clear */}
        <button
          onClick={onClear}
          className="flex items-center justify-center w-8 h-8 hover:bg-destructive/10 rounded-xl text-destructive/70 transition-colors"
          title="Clear all ink"
        >
          <Eraser className="h-4 w-4" />
        </button>

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

        {/* Collapse */}
        <button
          onClick={() => setExpanded(false)}
          className="flex items-center justify-center w-8 h-8 hover:bg-muted rounded-xl text-muted-foreground transition-colors text-xs"
          title="Minimize toolbar"
        >
          ▾
        </button>
      </div>

      {/* Secondary row: zoom + spacing */}
      <div className="flex items-center gap-3 bg-card/90 backdrop-blur-md shadow-lg border border-border rounded-2xl px-3 py-1.5 text-xs">
        {/* Zoom */}
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

        {/* Text spacing */}
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
