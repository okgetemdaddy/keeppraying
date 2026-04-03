import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PenLine, Pen, PenTool, CircleDot, Highlighter, Paintbrush,
  PaintbrushVertical, Droplets, Italic, Pencil, Minus, Underline,
  ChevronDown, Plus, Pipette,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import {
  type BrushType,
  type BrushConfig,
  BRUSH_PRESETS,
  getBrushesByCategory,
} from "@/lib/brushEngine";
import { BUILTIN_PALETTES, type ColorPalette } from "@/lib/colorPalettes";
import { useCustomPalette } from "@/hooks/useCustomPalette";

/* ── Icon map ── */
const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  "pen-line": PenLine,
  pen: Pen,
  "pen-tool": PenTool,
  "circle-dot": CircleDot,
  highlighter: Highlighter,
  paintbrush: Paintbrush,
  "paintbrush-vertical": PaintbrushVertical,
  droplets: Droplets,
  italic: Italic,
  pencil: Pencil,
  minus: Minus,
  underline: Underline,
};

function BrushIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = ICON_MAP[icon] ?? Pen;
  return <Icon className={className} />;
}

/* ── Stroke preview (tiny curved sample line) ── */
function StrokePreview({ brush, color, size }: { brush: BrushConfig; color: string; size: number }) {
  const previewSize = Math.min(size, 8);
  const opacity = brush.opacity;
  return (
    <svg width="32" height="16" viewBox="0 0 32 16" className="shrink-0">
      <path
        d="M 2 12 Q 8 2, 16 8 T 30 4"
        fill="none"
        stroke={color}
        strokeWidth={previewSize * 0.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={opacity}
        style={{ mixBlendMode: brush.blendMode }}
      />
    </svg>
  );
}

/* ── Recent colors helpers ── */
const RECENT_KEY = "bible_recent_colors";
function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (raw) return JSON.parse(raw) as string[];
  } catch {}
  return ["#1A1A1A", "#4A0E0E", "#0f4d9c", "#0f9c4d"];
}
function saveRecent(colors: string[]) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(colors.slice(0, 5))); } catch {}
}

/* ── Last brush persistence ── */
const BRUSH_KEY = "bible_last_brush";
function loadLastBrush(): BrushType {
  try {
    const raw = localStorage.getItem(BRUSH_KEY);
    if (raw && raw in BRUSH_PRESETS) return raw as BrushType;
  } catch {}
  return "ballpoint";
}
function saveLastBrush(type: BrushType) {
  try { localStorage.setItem(BRUSH_KEY, type); } catch {}
}

const CATEGORIES = [
  { key: "writing" as const, label: "Writing", emoji: "✏️" },
  { key: "marking" as const, label: "Marking", emoji: "🖍️" },
  { key: "artistic" as const, label: "Artistic", emoji: "🎨" },
] as const;

interface ToolPaletteProps {
  activeBrush: BrushConfig;
  activeColor: string;
  activeSize: number;
  activeOpacity: number;
  onBrushChange: (brush: BrushConfig) => void;
  onColorChange: (color: string) => void;
  onSizeChange: (size: number) => void;
  onOpacityChange: (opacity: number) => void;
  compact?: boolean;
  isDark?: boolean;
}

export function ToolPalette({
  activeBrush,
  activeColor,
  activeSize,
  activeOpacity,
  onBrushChange,
  onColorChange,
  onSizeChange,
  onOpacityChange,
  compact = false,
  isDark = false,
}: ToolPaletteProps) {
  const [fullOpen, setFullOpen] = useState(false);
  const [categoryTab, setCategoryTab] = useState<"writing" | "marking" | "artistic">(activeBrush.category);
  const [paletteTab, setPaletteTab] = useState("mildliner");
  const [hexInput, setHexInput] = useState("");
  const [recentColors, setRecentColors] = useState<string[]>(loadRecent);
  const customPalette = useCustomPalette();

  const categoryBrushes = useMemo(() => getBrushesByCategory(categoryTab), [categoryTab]);

  const activePalette = useMemo(() => {
    if (paletteTab === "custom") {
      return { id: "custom", label: "Custom", colors: customPalette.colors } as ColorPalette;
    }
    return BUILTIN_PALETTES.find((p) => p.id === paletteTab) ?? BUILTIN_PALETTES[0];
  }, [paletteTab, customPalette.colors]);

  const handleBrushSelect = useCallback((brush: BrushConfig) => {
    onBrushChange(brush);
    onSizeChange(brush.defaultSize);
    onOpacityChange(brush.opacity);
    saveLastBrush(brush.type);
    try { navigator.vibrate?.(5); } catch {}
  }, [onBrushChange, onSizeChange, onOpacityChange]);

  const handleColorSelect = useCallback((color: string) => {
    onColorChange(color);
    setRecentColors((prev) => {
      const next = [color, ...prev.filter((c) => c !== color)].slice(0, 5);
      saveRecent(next);
      return next;
    });
  }, [onColorChange]);

  const handleHexSubmit = useCallback(() => {
    const hex = hexInput.trim();
    if (/^#?[0-9a-fA-F]{6}$/.test(hex)) {
      const color = hex.startsWith("#") ? hex : `#${hex}`;
      handleColorSelect(color);
      customPalette.addColor(color);
      setHexInput("");
    }
  }, [hexInput, handleColorSelect, customPalette]);

  /* ── Compact strip ── */
  if (compact && !fullOpen) {
    return (
      <div className="flex items-center gap-1.5">
        {/* Active brush button → opens full palette */}
        <button
          onClick={() => setFullOpen(true)}
          className="flex items-center gap-1 px-2 py-1 rounded-xl bg-muted/60 hover:bg-muted transition-colors"
          title={activeBrush.label}
        >
          <BrushIcon icon={activeBrush.icon} className="h-3.5 w-3.5 text-foreground" />
          <span className="text-[0.55rem] font-medium text-muted-foreground hidden sm:inline">
            {activeBrush.label}
          </span>
        </button>

        {/* Recent 4 colors */}
        {recentColors.slice(0, 4).map((c) => (
          <button
            key={c}
            onClick={() => handleColorSelect(c)}
            className={`w-6 h-6 rounded-full transition-all hover:scale-110 shrink-0 ${
              activeColor === c ? "ring-2 ring-offset-1 ring-amber-500" : ""
            }`}
            style={{
              backgroundColor: c,
              boxShadow: "inset 0 1px 3px rgba(0,0,0,0.2)",
            }}
          />
        ))}

        {/* Expand button */}
        <button
          onClick={() => setFullOpen(true)}
          className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground hover:bg-accent transition-colors"
          title="More tools"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
    );
  }

  /* ── Full palette ── */
  return (
    <>
      {/* Backdrop */}
      {compact && fullOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/20"
          onClick={() => setFullOpen(false)}
        />
      )}

      <AnimatePresence>
        {(fullOpen || !compact) && (
          <motion.div
            initial={{ y: 300, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 300, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className={`${compact ? "fixed bottom-0 left-0 right-0 z-50" : "w-full"} bg-card/95 backdrop-blur-xl border-t border-border shadow-2xl rounded-t-3xl overflow-hidden`}
            style={{ maxHeight: "70vh" }}
          >
            {/* Handle bar */}
            {compact && (
              <div className="flex justify-center py-2">
                <button
                  onClick={() => setFullOpen(false)}
                  className="w-10 h-1 bg-muted-foreground/30 rounded-full"
                />
              </div>
            )}

            <div className="overflow-y-auto px-4 pb-6 space-y-4" style={{ maxHeight: compact ? "65vh" : "auto" }}>
              {/* ── Category tabs ── */}
              <div className="flex items-center gap-1 bg-muted/40 rounded-2xl p-1">
                {CATEGORIES.map(({ key, label, emoji }) => (
                  <button
                    key={key}
                    onClick={() => setCategoryTab(key)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      categoryTab === key
                        ? "bg-card shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>{emoji}</span>
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {/* ── Brush grid ── */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {categoryBrushes.map((brush) => {
                  const isActive = activeBrush.type === brush.type;
                  return (
                    <button
                      key={brush.type}
                      onClick={() => handleBrushSelect(brush)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all ${
                        isActive
                          ? "bg-amber-100/80 dark:bg-amber-900/30 ring-2 ring-amber-500"
                          : "bg-muted/30 hover:bg-muted/60"
                      }`}
                    >
                      <BrushIcon icon={brush.icon} className={`h-5 w-5 ${isActive ? "text-amber-700 dark:text-amber-400" : "text-foreground"}`} />
                      <span className={`text-[0.6rem] font-medium leading-tight ${isActive ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>
                        {brush.label}
                      </span>
                      <StrokePreview brush={brush} color={activeColor} size={brush.defaultSize} />
                    </button>
                  );
                })}
              </div>

              {/* ── Size slider ── */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Size</span>
                  <div className="flex items-center gap-2">
                    {/* Live size preview circle */}
                    <div
                      className="rounded-full shrink-0"
                      style={{
                        width: Math.max(4, Math.min(activeSize, 24)),
                        height: Math.max(4, Math.min(activeSize, 24)),
                        backgroundColor: activeColor,
                        opacity: activeOpacity,
                      }}
                    />
                    <span className="text-xs font-mono text-muted-foreground w-6 text-right">{activeSize}px</span>
                  </div>
                </div>
                <Slider
                  value={[activeSize]}
                  min={activeBrush.minSize}
                  max={activeBrush.maxSize}
                  step={1}
                  onValueChange={([v]) => onSizeChange(v)}
                />
              </div>

              {/* ── Opacity slider (only for brushes that support variable opacity) ── */}
              {activeBrush.opacity < 1 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Opacity</span>
                    <span className="text-xs font-mono text-muted-foreground">
                      {Math.round(activeOpacity * 100)}%
                    </span>
                  </div>
                  <Slider
                    value={[activeOpacity]}
                    min={0.05}
                    max={1}
                    step={0.05}
                    onValueChange={([v]) => onOpacityChange(v)}
                  />
                </div>
              )}

              {/* ── Color palette ── */}
              <div className="space-y-2">
                {/* Palette tabs */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                  {BUILTIN_PALETTES.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPaletteTab(p.id)}
                      className={`px-2.5 py-1 rounded-xl text-[0.6rem] font-medium whitespace-nowrap transition-colors ${
                        paletteTab === p.id
                          ? "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                  <button
                    onClick={() => setPaletteTab("custom")}
                    className={`px-2.5 py-1 rounded-xl text-[0.6rem] font-medium whitespace-nowrap transition-colors ${
                      paletteTab === "custom"
                        ? "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    Custom
                  </button>
                </div>

                {/* Color grid */}
                <div className="flex flex-wrap gap-2">
                  {activePalette.colors.map((c) => (
                    <button
                      key={c}
                      onClick={() => handleColorSelect(c)}
                      className={`w-8 h-8 rounded-xl transition-all hover:scale-110 ${
                        activeColor === c ? "ring-2 ring-offset-2 ring-amber-500" : ""
                      }`}
                      style={{
                        backgroundColor: c,
                        boxShadow: "inset 0 2px 4px rgba(0,0,0,0.15)",
                      }}
                    />
                  ))}
                  {paletteTab === "custom" && activePalette.colors.length === 0 && (
                    <p className="text-xs text-muted-foreground py-2">
                      Enter a hex color below to build your palette.
                    </p>
                  )}
                </div>

                {/* Hex input */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs text-muted-foreground font-mono">Hex:</span>
                  <input
                    type="text"
                    value={hexInput}
                    onChange={(e) => setHexInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleHexSubmit()}
                    placeholder="#B8860B"
                    className="flex-1 bg-muted/40 border border-border rounded-lg px-2 py-1 text-xs font-mono text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-1 focus:ring-amber-500"
                    maxLength={7}
                  />
                  <button
                    onClick={handleHexSubmit}
                    className="px-2 py-1 rounded-lg bg-muted hover:bg-accent text-xs font-medium text-muted-foreground transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
