import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lamp, Check, ChevronDown, Palette, Undo2, Sparkles } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { ATMOSPHERES, AtmosphereThumbnail } from "@/components/board/AtmosphereCanvas";
import type { Atmosphere } from "@/components/board/AtmosphereCanvas";

/* ── Preset definitions ───────────────────────────────────────────────────── */
export interface ThemePreset {
  name: string;
  bg: string;
  text: string;
  accent: string;
  darkBg: string;
  darkText: string;
  darkAccent: string;
}

const PRESETS: ThemePreset[] = [
  { name: "Warm Parchment",    bg: "#F8F1E3", text: "#2C2418", accent: "#B85C38", darkBg: "#2C2418", darkText: "#F8F1E3", darkAccent: "#D4845E" },
  { name: "Gentle Sage",       bg: "#E8F0E8", text: "#1F2C22", accent: "#3E6A4E", darkBg: "#1A2A1E", darkText: "#D8E8D8", darkAccent: "#5E9A6E" },
  { name: "Heavenly Sky",      bg: "#E0F0FA", text: "#132A4A", accent: "#2A5A9E", darkBg: "#0E1E34", darkText: "#D0E4F6", darkAccent: "#5A8ACE" },
  { name: "Golden Sunrise",    bg: "#FAF0D8", text: "#3D2A0F", accent: "#E8B923", darkBg: "#2A1E0A", darkText: "#F5E8C8", darkAccent: "#F0D050" },
  { name: "Graceful Lavender", bg: "#F0E8FA", text: "#2C1F3D", accent: "#7B5FD4", darkBg: "#1E1530", darkText: "#E4D8F6", darkAccent: "#A08AE8" },
  { name: "Soft Peach",        bg: "#FAE8E0", text: "#3D2A1F", accent: "#E07A5F", darkBg: "#2E1E16", darkText: "#F6DCD2", darkAccent: "#F09878" },
  { name: "Light Olive",       bg: "#F0F5E8", text: "#263D26", accent: "#6B8E5E", darkBg: "#1A2A1A", darkText: "#E0ECd8", darkAccent: "#8AAE7E" },
  { name: "Pure Sand",         bg: "#F5F0E8", text: "#2C2418", accent: "#B85C38", darkBg: "#22201A", darkText: "#EAE4DA", darkAccent: "#D4845E" },
];

export { PRESETS as THEME_SANCTUARY_PRESETS };

type Scope = "board" | "all-cards" | "future";

const SCOPE_OPTIONS: { value: Scope; label: string }[] = [
  { value: "board",     label: "This Board Only" },
  { value: "all-cards", label: "All My Prayer Cards" },
  { value: "future",    label: "All Future Cards" },
];

/* ── Custom color palette swatches ──────────────────────────────────────── */
const BG_SWATCHES = [
  "#FDF8F0", "#F8F1E3", "#F0F5E8", "#E0F0FA",
  "#F0E8FA", "#FAE8E0", "#F5F0E8", "#E8F0E8",
  "#FFF8F0", "#F0F0F0", "#E8E8F0", "#F8F0F0",
];

const ACCENT_SWATCHES = [
  "#B85C38", "#3E6A4E", "#2A5A9E", "#E8B923", "#7B5FD4", "#E07A5F",
];

/* ── Mini prayer card preview ─────────────────────────────────────────── */
function MiniCard({ bg, text, accent, title, body }: {
  bg: string; text: string; accent: string; title: string; body: string;
}) {
  return (
    <div
      className="rounded-xl p-3 shadow-sm border transition-colors duration-300"
      style={{ background: bg, borderColor: `${accent}30` }}
    >
      <p className="text-[10px] font-semibold leading-tight mb-1" style={{ color: text }}>{title}</p>
      <p className="text-[8px] leading-relaxed line-clamp-2" style={{ color: `${text}BB` }}>{body}</p>
      <div className="flex gap-1 mt-1.5">
        <span className="text-[7px] px-1.5 py-0.5 rounded-full" style={{ background: `${accent}18`, color: accent }}>Grace</span>
        <span className="text-[7px] px-1.5 py-0.5 rounded-full" style={{ background: `${accent}18`, color: accent }}>Peace</span>
      </div>
    </div>
  );
}

/* ── Live preview panel ──────────────────────────────────────────────── */
function LivePreview({ bg, text, accent }: { bg: string; text: string; accent: string }) {
  const cards = [
    { title: "Morning Prayer", body: "Lord, as the sun rises, fill my heart with Your peace and guide my steps today…" },
    { title: "Family Blessing", body: "Father, pour out Your protection and love over my family. Keep us in Your care…" },
    { title: "Gratitude", body: "Thank You, God, for Your faithfulness. Every good gift comes from You alone…" },
  ];
  return (
    <div className="space-y-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: `${text}88` }}>
        Live Preview
      </p>
      {cards.map((c, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08, duration: 0.3 }}
        >
          <MiniCard bg={bg} text={text} accent={accent} title={c.title} body={c.body} />
        </motion.div>
      ))}
    </div>
  );
}

/* ── Swatch button ─────────────────────────────────────────────────── */
function Swatch({ color, selected, onClick }: { color: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-8 h-8 rounded-full border-2 transition-all hover:scale-110 flex items-center justify-center"
      style={{
        background: color,
        borderColor: selected ? color : `${color}40`,
        boxShadow: selected ? `0 0 0 3px ${color}40` : "none",
      }}
    >
      {selected && <Check className="w-3.5 h-3.5" style={{ color: isLightColor(color) ? "#333" : "#fff" }} />}
    </button>
  );
}

function isLightColor(hex: string): boolean {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
}

function autoTextColor(bg: string): string {
  return isLightColor(bg) ? "#1a1a2e" : "#f0f0f0";
}

/* ── Snapshot type for revert ────────────────────────────────────────── */
interface ThemeSnapshot {
  theme_preset: string;
  theme_bg: string;
  theme_text: string;
  theme_accent: string;
  theme_scope: string;
}

const SNAPSHOT_KEY = "kp_theme_sanctuary_snapshot";

function saveSnapshot(snapshot: ThemeSnapshot) {
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {}
}

function loadSnapshot(): ThemeSnapshot | null {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/* ── Main modal ────────────────────────────────────────────────────── */
interface ThemeSanctuaryModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentPreset: string | null;
  currentBg: string | null;
  currentText: string | null;
  currentAccent: string | null;
  currentScope: string;
  currentAtmosphereId?: string;
  onApply: (data: {
    theme_preset: string;
    theme_bg: string;
    theme_text: string;
    theme_accent: string;
    theme_scope: string;
  }) => void;
  onAtmosphereChange?: (atmosphereId: string) => void;
}

export function ThemeSanctuaryModal({
  isOpen,
  onOpenChange,
  currentPreset,
  currentBg,
  currentText,
  currentAccent,
  currentScope,
  onApply,
}: ThemeSanctuaryModalProps) {
  const isMobile = useIsMobile();

  // Local state
  const [selectedPresetName, setSelectedPresetName] = useState<string | null>(
    currentPreset || "Golden Sunrise"
  );
  const [customMode, setCustomMode] = useState(false);
  const [customBg, setCustomBg] = useState(currentBg || BG_SWATCHES[0]);
  const [customText, setCustomText] = useState(currentText || "#2C2418");
  const [customAccent, setCustomAccent] = useState(currentAccent || ACCENT_SWATCHES[0]);
  const [scope, setScope] = useState<Scope>((currentScope as Scope) || "board");
  const [previewExpanded, setPreviewExpanded] = useState(!isMobile);
  const [previousSnapshot, setPreviousSnapshot] = useState<ThemeSnapshot | null>(null);

  // Load any existing snapshot on mount
  useEffect(() => {
    if (isOpen) {
      setPreviousSnapshot(loadSnapshot());
    }
  }, [isOpen]);

  // Determine if dark mode is active
  const isDark = useMemo(() => {
    if (typeof document === "undefined") return false;
    return document.documentElement.classList.contains("dark");
  }, [isOpen]);

  // Computed colors for preview
  const previewColors = useMemo(() => {
    if (customMode) {
      return { bg: customBg, text: customText, accent: customAccent };
    }
    const preset = PRESETS.find(p => p.name === selectedPresetName) || PRESETS[3];
    if (isDark) {
      return { bg: preset.darkBg, text: preset.darkText, accent: preset.darkAccent };
    }
    return { bg: preset.bg, text: preset.text, accent: preset.accent };
  }, [customMode, customBg, customText, customAccent, selectedPresetName, isDark]);

  const handleSelectPreset = useCallback((name: string) => {
    setSelectedPresetName(name);
    setCustomMode(false);
  }, []);

  const handleApply = useCallback(() => {
    // Save current theme as a snapshot before applying new one
    const currentSnapshot: ThemeSnapshot = {
      theme_preset: currentPreset || "Golden Sunrise",
      theme_bg: currentBg || PRESETS[3].bg,
      theme_text: currentText || PRESETS[3].text,
      theme_accent: currentAccent || PRESETS[3].accent,
      theme_scope: currentScope,
    };
    saveSnapshot(currentSnapshot);
    setPreviousSnapshot(currentSnapshot);

    const colors = customMode
      ? { bg: customBg, text: customText, accent: customAccent }
      : (() => {
          const p = PRESETS.find(pr => pr.name === selectedPresetName) || PRESETS[3];
          return isDark
            ? { bg: p.darkBg, text: p.darkText, accent: p.darkAccent }
            : { bg: p.bg, text: p.text, accent: p.accent };
        })();

    onApply({
      theme_preset: customMode ? "custom" : selectedPresetName || "Golden Sunrise",
      theme_bg: colors.bg,
      theme_text: colors.text,
      theme_accent: colors.accent,
      theme_scope: scope,
    });
    toast.success("Theme applied — you can revert anytime");
    onOpenChange(false);
  }, [customMode, customBg, customText, customAccent, selectedPresetName, scope, isDark, onApply, onOpenChange, currentPreset, currentBg, currentText, currentAccent, currentScope]);

  const handleRevert = useCallback(() => {
    const snap = previousSnapshot || loadSnapshot();
    if (!snap) {
      toast.info("No previous theme to revert to");
      return;
    }
    onApply(snap);
    // After reverting, clear the snapshot
    try { localStorage.removeItem(SNAPSHOT_KEY); } catch {}
    setPreviousSnapshot(null);
    toast.success("Reverted to your previous theme");
    onOpenChange(false);
  }, [previousSnapshot, onApply, onOpenChange]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className={`p-0 overflow-hidden border-0 shadow-2xl ${
          isMobile
            ? "max-w-full w-full h-full max-h-full rounded-none"
            : "max-w-[920px] rounded-2xl"
        }`}
        style={{ background: "hsl(var(--background))" }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className={`flex flex-col ${isMobile ? "h-full" : "max-h-[85vh]"}`}
        >
          {/* ── Header ──────────────────────────────────────────────── */}
          <div className="text-center pt-8 pb-2 px-6">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Lamp className="w-5 h-5 text-amber-500" />
            </div>
            <h2
              className="text-2xl font-serif font-semibold text-foreground"
            >
              Choose the Atmosphere of Your Prayer Closet
            </h2>
            <p className="text-muted-foreground text-sm mt-2 max-w-md mx-auto">
              Let the colors and light around you reflect the peace of Christ.
            </p>
          </div>

          {/* ── Body ────────────────────────────────────────────────── */}
          <div className={`flex-1 overflow-y-auto ${isMobile ? "px-5 pb-4" : "px-8 pb-6"}`}>
            <div className={isMobile ? "" : "flex gap-8"}>
              {/* Left / Main column */}
              <div className={isMobile ? "" : "flex-1 min-w-0"}>

                {/* Section 1: Preset themes */}
                <div className="mt-6">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    Sacred Presets
                  </p>
                  <div className={`grid gap-3 ${isMobile ? "grid-cols-2" : "grid-cols-4"}`}>
                    {PRESETS.map((preset) => {
                      const isSelected = !customMode && selectedPresetName === preset.name;
                      const displayBg = isDark ? preset.darkBg : preset.bg;
                      const displayText = isDark ? preset.darkText : preset.text;
                      const displayAccent = isDark ? preset.darkAccent : preset.accent;

                      return (
                        <motion.button
                          key={preset.name}
                          whileHover={{ scale: 1.05, boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.25)" }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => handleSelectPreset(preset.name)}
                          className="relative rounded-xl overflow-hidden text-left transition-all duration-300"
                          style={{
                            background: displayBg,
                            boxShadow: isSelected
                              ? `0 0 0 2px ${displayAccent}, 0 0 0 6px ${displayAccent}30`
                              : "0 2px 8px rgba(0,0,0,0.08)",
                          }}
                        >
                          <div className="p-3">
                            <p
                              className="text-[11px] font-semibold mb-2 truncate"
                              style={{ color: displayText }}
                            >
                              {preset.name}
                            </p>
                            {/* Mini preview cards */}
                            <div className="space-y-1.5">
                              <div
                                className="rounded-md p-1.5"
                                style={{ background: `${displayAccent}12`, borderLeft: `2px solid ${displayAccent}` }}
                              >
                                <div className="h-1.5 rounded-full w-3/4 mb-1" style={{ background: `${displayText}30` }} />
                                <div className="h-1 rounded-full w-1/2" style={{ background: `${displayText}18` }} />
                              </div>
                              <div
                                className="rounded-md p-1.5"
                                style={{ background: `${displayAccent}08` }}
                              >
                                <div className="h-1.5 rounded-full w-2/3 mb-1" style={{ background: `${displayText}25` }} />
                                <div className="h-1 rounded-full w-1/3" style={{ background: `${displayText}15` }} />
                              </div>
                            </div>
                          </div>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                              style={{ background: displayAccent }}
                            >
                              <Check className="w-3 h-3" style={{ color: isLightColor(displayAccent) ? "#333" : "#fff" }} />
                            </motion.div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Section 2: Custom Color Creator */}
                <div className="mt-8">
                  <button
                    onClick={() => {
                      setCustomMode(!customMode);
                      if (!customMode) setSelectedPresetName(null);
                    }}
                    className="flex items-center gap-2 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
                  >
                    <Palette className="w-4 h-4" />
                    Create Your Own
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform ${customMode ? "rotate-180" : ""}`}
                    />
                  </button>

                  <AnimatePresence>
                    {customMode && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-4 space-y-5">
                          {/* Background swatches */}
                          <div>
                            <p className="text-[11px] text-muted-foreground font-medium mb-2">Background</p>
                            <div className="flex flex-wrap gap-2">
                              {BG_SWATCHES.map(c => (
                                <Swatch key={c} color={c} selected={customBg === c} onClick={() => {
                                  setCustomBg(c);
                                  setCustomText(autoTextColor(c));
                                }} />
                              ))}
                            </div>
                          </div>

                          {/* Text color */}
                          <div>
                            <p className="text-[11px] text-muted-foreground font-medium mb-2">
                              Text Color <span className="text-muted-foreground/50">(auto-suggested)</span>
                            </p>
                            <div className="flex items-center gap-3">
                              <div
                                className="w-8 h-8 rounded-full border-2 border-border"
                                style={{ background: customText }}
                              />
                              <input
                                type="text"
                                value={customText}
                                onChange={e => setCustomText(e.target.value)}
                                className="text-xs font-mono bg-muted/50 border border-border rounded-lg px-3 py-1.5 w-24 outline-none focus:ring-1 focus:ring-ring"
                              />
                            </div>
                          </div>

                          {/* Accent swatches */}
                          <div>
                            <p className="text-[11px] text-muted-foreground font-medium mb-2">Accent</p>
                            <div className="flex flex-wrap gap-2">
                              {ACCENT_SWATCHES.map(c => (
                                <Swatch key={c} color={c} selected={customAccent === c} onClick={() => setCustomAccent(c)} />
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Section 3: Scope toggle */}
                <div className="mt-8">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    Apply To
                  </p>
                  <div className="flex rounded-xl p-1 bg-muted/50 border border-border">
                    {SCOPE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setScope(opt.value)}
                        className={`flex-1 text-xs py-2.5 px-2 rounded-lg font-medium transition-all ${
                          scope === opt.value
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mobile preview toggle */}
                {isMobile && (
                  <button
                    onClick={() => setPreviewExpanded(!previewExpanded)}
                    className="mt-6 flex items-center gap-2 text-sm font-medium text-muted-foreground"
                  >
                    Preview
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${previewExpanded ? "rotate-180" : ""}`} />
                  </button>
                )}

                {/* Mobile preview (collapsible) */}
                {isMobile && (
                  <AnimatePresence>
                    {previewExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden mt-3"
                      >
                        <div
                          className="rounded-2xl p-4 border"
                          style={{
                            background: previewColors.bg,
                            borderColor: `${previewColors.accent}30`,
                          }}
                        >
                          <LivePreview {...previewColors} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </div>

              {/* Right column — Desktop live preview */}
              {!isMobile && (
                <div className="w-[260px] shrink-0 mt-6">
                  <div
                    className="rounded-2xl p-5 border sticky top-4 transition-colors duration-300"
                    style={{
                      background: previewColors.bg,
                      borderColor: `${previewColors.accent}30`,
                    }}
                  >
                    <LivePreview {...previewColors} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Footer ──────────────────────────────────────────────── */}
          <div className="border-t border-border px-6 py-4 flex items-center justify-between">
            <div>
              {(previousSnapshot || loadSnapshot()) && (
                <Button
                  variant="outline"
                  onClick={handleRevert}
                  className="rounded-xl gap-2 text-muted-foreground hover:text-foreground"
                >
                  <Undo2 className="w-4 h-4" />
                  Revert to Previous
                </Button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleApply}
                className="rounded-xl gap-2 bg-amber-600 hover:bg-amber-700 text-white px-6"
              >
                <Lamp className="w-4 h-4" />
                Apply Theme
              </Button>
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
