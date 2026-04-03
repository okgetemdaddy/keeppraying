import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { type BrushConfig, type BrushType, BRUSH_PRESETS } from "@/lib/brushEngine";

export type ActiveTool = "pen" | "eraser" | "select" | "voice";

/* ── Load helpers ── */
function loadBrush(): BrushConfig {
  try {
    const raw = localStorage.getItem("bible_last_brush");
    if (raw && raw in BRUSH_PRESETS) return BRUSH_PRESETS[raw as BrushType];
  } catch {}
  return BRUSH_PRESETS.ballpoint;
}

function loadRecentColors(): string[] {
  try {
    const raw = localStorage.getItem("bible_recent_colors");
    if (raw) return JSON.parse(raw) as string[];
  } catch {}
  return ["#1A1A1A", "#4A0E0E", "#0f4d9c", "#0f9c4d"];
}

interface BibleStudyState {
  /* ── Tool state ── */
  activeTool: ActiveTool;
  setActiveTool: (tool: ActiveTool) => void;

  /* ── Brush state (replaces penColor/penSize/penGlow) ── */
  activeBrush: BrushConfig;
  setActiveBrush: (brush: BrushConfig) => void;
  activeColor: string;
  setActiveColor: (color: string) => void;
  activeOpacity: number;
  setActiveOpacity: (opacity: number) => void;
  activeBrushSize: number;
  setActiveBrushSize: (size: number) => void;
  recentColors: string[];

  /* ── Backward-compatible getters ── */
  penColor: string;
  penSize: number;
  penGlow: string | null;

  /* ── Zoom & spacing ── */
  zoomLevel: number;
  setZoomLevel: (zoom: number) => void;
  textSpacing: number;
  setTextSpacing: (spacing: number) => void;

  /* ── Pocket (right-hand drawer) ── */
  isPocketOpen: boolean;
  setIsPocketOpen: (open: boolean) => void;
  pocketTab: "notes" | "guide" | "journal";
  setPocketTab: (tab: "notes" | "guide" | "journal") => void;

  /* ── Pen settings (legacy — kept for non-refactored consumers) ── */
  setPenColor: (color: string) => void;
  setPenSize: (size: number) => void;
  setPenGlow: (glow: string | null) => void;
  fingerDrawing: boolean;
  setFingerDrawing: (enabled: boolean) => void;

  /* ── Study mode ── */
  studyMode: boolean;
  setStudyMode: (on: boolean) => void;
  pencilDetected: boolean;
  setPencilDetected: (detected: boolean) => void;

  /* ── Pencil onboarding ── */
  pencilOnboarded: boolean;
  markPencilOnboarded: () => void;
}

const BibleStudyContext = createContext<BibleStudyState | null>(null);

export function useBibleStudy() {
  const ctx = useContext(BibleStudyContext);
  if (!ctx) throw new Error("useBibleStudy must be used within BibleStudyProvider");
  return ctx;
}

/**
 * Optional hook that returns null when outside provider —
 * useful for components that may render outside the Bible reader.
 */
export function useBibleStudyOptional() {
  return useContext(BibleStudyContext);
}

interface BibleStudyProviderProps {
  children: React.ReactNode;
}

export function BibleStudyProvider({ children }: BibleStudyProviderProps) {
  // Tool
  const [activeTool, setActiveTool] = useState<ActiveTool>("pen");

  // ── New brush system ──
  const [activeBrush, setActiveBrushRaw] = useState<BrushConfig>(loadBrush);
  const [activeColor, setActiveColorRaw] = useState("#1a1a1a");
  const [activeOpacity, setActiveOpacity] = useState(1);
  const [activeBrushSize, setActiveBrushSize] = useState(() => loadBrush().defaultSize);
  const [recentColors, setRecentColors] = useState<string[]>(loadRecentColors);

  const setActiveBrush = useCallback((brush: BrushConfig) => {
    setActiveBrushRaw(brush);
    try { localStorage.setItem("bible_last_brush", brush.type); } catch {}
  }, []);

  const setActiveColor = useCallback((color: string) => {
    setActiveColorRaw(color);
    setRecentColors((prev) => {
      const next = [color, ...prev.filter((c) => c !== color)].slice(0, 5);
      try { localStorage.setItem("bible_recent_colors", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  // Zoom
  const [zoomLevel, setZoomLevelRaw] = useState(() => {
    try { return parseFloat(localStorage.getItem("bible_ink_zoom") ?? "1"); } catch { return 1; }
  });
  const setZoomLevel = useCallback((v: number) => {
    setZoomLevelRaw(v);
    try { localStorage.setItem("bible_ink_zoom", String(v)); } catch {}
  }, []);

  // Spacing
  const [textSpacing, setTextSpacingRaw] = useState(() => {
    try { return parseFloat(localStorage.getItem("bible_ink_spacing") ?? "2.8"); } catch { return 2.8; }
  });
  const setTextSpacing = useCallback((v: number) => {
    setTextSpacingRaw(v);
    try { localStorage.setItem("bible_ink_spacing", String(v)); } catch {}
  }, []);

  // Pocket
  const [isPocketOpen, setIsPocketOpen] = useState(false);
  const [pocketTab, setPocketTab] = useState<"notes" | "guide" | "journal">("notes");

  // Legacy pen setters (map to new system)
  const setPenColor = useCallback((c: string) => setActiveColor(c), [setActiveColor]);
  const setPenSize = useCallback((s: number) => setActiveBrushSize(s), []);
  const [penGlowState, setPenGlowState] = useState<string | null>(() => {
    try { return localStorage.getItem("bible_pen_glow") || null; } catch { return null; }
  });
  const setPenGlow = useCallback((v: string | null) => {
    setPenGlowState(v);
    try { if (v) localStorage.setItem("bible_pen_glow", v); else localStorage.removeItem("bible_pen_glow"); } catch {}
  }, []);
  const [fingerDrawing, setFingerDrawing] = useState(false);

  // Study mode
  const [studyMode, setStudyModeRaw] = useState(() => {
    try { return localStorage.getItem("bible_study_mode") === "true"; } catch { return false; }
  });
  const setStudyMode = useCallback((v: boolean) => {
    setStudyModeRaw(v);
    try { localStorage.setItem("bible_study_mode", String(v)); } catch {}
  }, []);

  const [pencilDetected, setPencilDetected] = useState(false);

  // Onboarding
  const [pencilOnboarded, setPencilOnboarded] = useState(() => {
    try { return localStorage.getItem("pencil-onboarded") === "true"; } catch { return false; }
  });
  const markPencilOnboarded = useCallback(() => {
    setPencilOnboarded(true);
    try { localStorage.setItem("pencil-onboarded", "true"); } catch {}
  }, []);

  const value = useMemo<BibleStudyState>(() => ({
    activeTool, setActiveTool,
    // New brush system
    activeBrush, setActiveBrush,
    activeColor, setActiveColor,
    activeOpacity, setActiveOpacity,
    activeBrushSize, setActiveBrushSize,
    recentColors,
    // Backward compat
    penColor: activeColor,
    penSize: activeBrushSize,
    penGlow: penGlowState,
    // Zoom
    zoomLevel, setZoomLevel,
    textSpacing, setTextSpacing,
    isPocketOpen, setIsPocketOpen,
    pocketTab, setPocketTab,
    setPenColor, setPenSize, setPenGlow,
    fingerDrawing, setFingerDrawing,
    studyMode, setStudyMode,
    pencilDetected, setPencilDetected,
    pencilOnboarded, markPencilOnboarded,
  }), [
    activeTool,
    activeBrush, setActiveBrush,
    activeColor, setActiveColor,
    activeOpacity,
    activeBrushSize, recentColors,
    penGlowState,
    zoomLevel, setZoomLevel, textSpacing, setTextSpacing,
    isPocketOpen, pocketTab,
    setPenColor, setPenSize, setPenGlow,
    fingerDrawing,
    studyMode, setStudyMode, pencilDetected, pencilOnboarded, markPencilOnboarded,
  ]);

  return (
    <BibleStudyContext.Provider value={value}>
      {children}
    </BibleStudyContext.Provider>
  );
}
