import React, { createContext, useContext, useState, useCallback, useMemo } from "react";

export type ActiveTool = "pen" | "eraser" | "select" | "voice";

interface BibleStudyState {
  /* ── Tool state ── */
  activeTool: ActiveTool;
  setActiveTool: (tool: ActiveTool) => void;

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

  /* ── Pen settings ── */
  penColor: string;
  setPenColor: (color: string) => void;
  penSize: number;
  setPenSize: (size: number) => void;
  penGlow: string | null;
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

  // Pen
  const [penColor, setPenColor] = useState("#1a1a1a");
  const [penSize, setPenSize] = useState(8);
  const [penGlow, setPenGlowRaw] = useState<string | null>(() => {
    try { return localStorage.getItem("bible_pen_glow") || null; } catch { return null; }
  });
  const setPenGlow = useCallback((v: string | null) => {
    setPenGlowRaw(v);
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
    zoomLevel, setZoomLevel,
    textSpacing, setTextSpacing,
    isPocketOpen, setIsPocketOpen,
    pocketTab, setPocketTab,
    penColor, setPenColor,
    penSize, setPenSize,
    penGlow, setPenGlow,
    fingerDrawing, setFingerDrawing,
    studyMode, setStudyMode,
    pencilDetected, setPencilDetected,
    pencilOnboarded, markPencilOnboarded,
  }), [
    activeTool, zoomLevel, setZoomLevel, textSpacing, setTextSpacing,
    isPocketOpen, pocketTab, penColor, penSize, penGlow, setPenGlow, fingerDrawing,
    studyMode, setStudyMode, pencilDetected, pencilOnboarded, markPencilOnboarded,
  ]);

  return (
    <BibleStudyContext.Provider value={value}>
      {children}
    </BibleStudyContext.Provider>
  );
}
