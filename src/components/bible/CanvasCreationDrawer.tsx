import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Timer, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  useBibleChapterVerses,
  type BibleBookMeta,
} from "@/hooks/useBibleReader";

// iPadOS: Bottom sheet maps to UISheetPresentationController with .medium() / .large() detents

/* ── Types ── */

export interface CanvasSessionConfig {
  sessionId?: string;
  verses: { number: number; text: string }[];
  verseRange: string;
  paper: { widthIn: number; heightIn: number };
  textBox: { x: number; y: number; width: number; height: number };
  typography: { charsPerLine: number; lineSpacing: number; fontSize: number };
  marginStyle: "none" | "dots" | "lines";
  timerMinutes: number | null;
}

interface CanvasCreationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bibleId: number | undefined;
  books: BibleBookMeta[] | undefined;
  currentBookUsfm?: string;
  currentChapterIdx?: number;
  onStartSession: (config: CanvasSessionConfig) => void;
}

/* ── Paper presets (px at 96dpi) ── */
const PAPER_PRESETS = [
  { label: "Full Page", widthPx: 1056, heightPx: 1632 },
  { label: "Half Page", widthPx: 1056, heightPx: 816 },
  { label: "Square", widthPx: 1056, heightPx: 1056 },
  { label: "Custom", widthPx: 0, heightPx: 0 },
] as const;

const PPI = 96;

const SPACING_PRESETS = [
  { label: "Tight", value: 1.8 },
  { label: "Comfortable", value: 2.4 },
  { label: "Spacious", value: 2.8 },
  { label: "Double", value: 3.5 },
] as const;

const MARGIN_STYLES = [
  { label: "Blank", value: "none" as const },
  { label: "Dot Grid", value: "dots" as const },
  { label: "Ruled", value: "lines" as const },
] as const;

const TIMER_PRESETS = [15, 30, 45, 60];

/* ── Resize handle positions ── */
type HandlePos = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
const HANDLES: HandlePos[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

function getHandleCursor(pos: HandlePos): string {
  const map: Record<HandlePos, string> = {
    nw: "nwse-resize", ne: "nesw-resize", se: "nwse-resize", sw: "nesw-resize",
    n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize",
  };
  return map[pos];
}

function getHandleStyle(pos: HandlePos): React.CSSProperties {
  const size = 8;
  const half = -size / 2;
  const base: React.CSSProperties = {
    position: "absolute", width: size, height: size,
    background: "hsl(var(--primary))", borderRadius: "50%", zIndex: 10,
    cursor: getHandleCursor(pos),
  };
  switch (pos) {
    case "nw": return { ...base, top: half, left: half };
    case "n":  return { ...base, top: half, left: "50%", marginLeft: half };
    case "ne": return { ...base, top: half, right: half };
    case "e":  return { ...base, top: "50%", marginTop: half, right: half };
    case "se": return { ...base, bottom: half, right: half };
    case "s":  return { ...base, bottom: half, left: "50%", marginLeft: half };
    case "sw": return { ...base, bottom: half, left: half };
    case "w":  return { ...base, top: "50%", marginTop: half, left: half };
  }
}

/* ── Margin Canvas (preview background) ── */
function MarginCanvasPreview({ style }: { style: "none" | "dots" | "lines" }) {
  if (style === "none") return null;
  return (
    <div className="pointer-events-none absolute inset-0">
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          {style === "dots" && (
            <pattern id="preview-dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="1" fill="rgba(0,0,0,0.08)" />
            </pattern>
          )}
          {style === "lines" && (
            <pattern id="preview-lines" x="0" y="0" width="100%" height="32" patternUnits="userSpaceOnUse">
              <line x1="0" y1="31" x2="100%" y2="31" stroke="rgba(0,0,0,0.06)" strokeWidth="0.5" />
            </pattern>
          )}
        </defs>
        <rect width="100%" height="100%" fill={style === "dots" ? "url(#preview-dots)" : "url(#preview-lines)"} />
      </svg>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   CANVAS CREATION DRAWER
   ════════════════════════════════════════════════════ */

export function CanvasCreationDrawer({
  open,
  onOpenChange,
  bibleId,
  books,
  currentBookUsfm,
  currentChapterIdx,
  onStartSession,
}: CanvasCreationDrawerProps) {
  const isMobile = useIsMobile();
  const { user } = useAuth();

  /* ── Verse selection ── */
  const [bookUsfm, setBookUsfm] = useState(currentBookUsfm ?? "GEN");
  const [chapterNum, setChapterNum] = useState(currentChapterIdx ?? 0);
  const [fromVerse, setFromVerse] = useState(1);
  const [toVerse, setToVerse] = useState(5);

  useEffect(() => {
    if (open && currentBookUsfm) setBookUsfm(currentBookUsfm);
    if (open && currentChapterIdx !== undefined) setChapterNum(currentChapterIdx);
  }, [open, currentBookUsfm, currentChapterIdx]);

  const selectedBook = useMemo(() => books?.find((b) => b.id === bookUsfm), [books, bookUsfm]);
  const selectedChapter = selectedBook?.chapters?.[chapterNum];
  const verseIds = useMemo(
    () => selectedChapter?.verses?.map((v) => v.passage_id),
    [selectedChapter],
  );

  const { data: allVerses } = useBibleChapterVerses(bibleId, bookUsfm, selectedChapter?.id, verseIds);

  const filteredVerses = useMemo(() => {
    if (!allVerses) return [];
    return allVerses.filter((v) => v.number >= fromVerse && v.number <= toVerse);
  }, [allVerses, fromVerse, toVerse]);

  const maxVerse = allVerses?.length ?? 176;

  useEffect(() => {
    if (allVerses && toVerse > allVerses.length) setToVerse(allVerses.length);
    if (allVerses && fromVerse > allVerses.length) setFromVerse(1);
  }, [allVerses]);

  /* ── Paper size ── */
  const [presetIdx, setPresetIdx] = useState(0);
  const [customWIn, setCustomWIn] = useState(8.5);
  const [customHIn, setCustomHIn] = useState(11);

  const paperWPx = presetIdx === 3 ? customWIn * PPI : PAPER_PRESETS[presetIdx].widthPx;
  const paperHPx = presetIdx === 3 ? customHIn * PPI : PAPER_PRESETS[presetIdx].heightPx;
  const paperWIn = paperWPx / PPI;
  const paperHIn = paperHPx / PPI;

  /* ── Typography ── */
  const [charsPerLine, setCharsPerLine] = useState(60);
  const [lineSpacingIdx, setLineSpacingIdx] = useState(2); // Spacious
  const lineSpacing = SPACING_PRESETS[lineSpacingIdx].value;

  /* ── Margin style ── */
  const [marginStyle, setMarginStyle] = useState<"none" | "dots" | "lines">("none");

  /* ── Text box position in inches ── */
  const [boxX, setBoxX] = useState(0.75);
  const [boxY, setBoxY] = useState(0.75);
  const [boxW, setBoxW] = useState(() => paperWIn - 1.5);
  const [boxH, setBoxH] = useState(() => paperHIn - 1.5);

  useEffect(() => {
    const margin = 0.75;
    setBoxX(margin);
    setBoxY(margin);
    setBoxW(paperWIn - margin * 2);
    setBoxH(paperHIn - margin * 2);
  }, [paperWIn, paperHIn]);

  /* ── Session Timer ── */
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(30);
  const [customTimer, setCustomTimer] = useState(false);

  /* ── Preview scaling ── */
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(0.45);

  useEffect(() => {
    if (!previewRef.current || !open) return;
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      const pad = 48;
      const scale = Math.min((width - pad) / paperWPx, (height - pad) / paperHPx, 1);
      setPreviewScale(Math.max(0.1, scale));
    });
    obs.observe(previewRef.current);
    return () => obs.disconnect();
  }, [open, paperWPx, paperHPx]);

  /* ── Drag / Resize logic ── */
  const interaction = useRef<{
    type: "drag" | "resize";
    handle?: HandlePos;
    startX: number;
    startY: number;
    origBox: { x: number; y: number; w: number; h: number };
  } | null>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, type: "drag" | "resize", handle?: HandlePos) => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      interaction.current = {
        type, handle, startX: e.clientX, startY: e.clientY,
        origBox: { x: boxX, y: boxY, w: boxW, h: boxH },
      };
    },
    [boxX, boxY, boxW, boxH],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!interaction.current) return;
      const { type, handle, startX, startY, origBox } = interaction.current;
      const dxIn = (e.clientX - startX) / (PPI * previewScale);
      const dyIn = (e.clientY - startY) / (PPI * previewScale);

      if (type === "drag") {
        setBoxX(Math.max(0, Math.min(paperWIn - origBox.w, origBox.x + dxIn)));
        setBoxY(Math.max(0, Math.min(paperHIn - origBox.h, origBox.y + dyIn)));
      } else if (type === "resize" && handle) {
        let nx = origBox.x, ny = origBox.y, nw = origBox.w, nh = origBox.h;
        const MIN = 1;
        if (handle.includes("e")) nw = Math.max(MIN, origBox.w + dxIn);
        if (handle.includes("w")) { nx = origBox.x + dxIn; nw = Math.max(MIN, origBox.w - dxIn); }
        if (handle.includes("s")) nh = Math.max(MIN, origBox.h + dyIn);
        if (handle.includes("n")) { ny = origBox.y + dyIn; nh = Math.max(MIN, origBox.h - dyIn); }
        if (nx < 0) { nw += nx; nx = 0; }
        if (ny < 0) { nh += ny; ny = 0; }
        if (nx + nw > paperWIn) nw = paperWIn - nx;
        if (ny + nh > paperHIn) nh = paperHIn - ny;
        setBoxX(nx); setBoxY(ny); setBoxW(nw); setBoxH(nh);
      }
    },
    [previewScale, paperWIn, paperHIn],
  );

  const handlePointerUp = useCallback(() => { interaction.current = null; }, []);

  /* ── Verse range label ── */
  const verseRange = useMemo(() => {
    const bookName = selectedBook?.title ?? bookUsfm;
    const ch = chapterNum + 1;
    if (fromVerse === toVerse) return `${bookName} ${ch}:${fromVerse}`;
    return `${bookName} ${ch}:${fromVerse}-${toVerse}`;
  }, [selectedBook, bookUsfm, chapterNum, fromVerse, toVerse]);

  /* ── Font size from chars per line ── */
  const fontSize = useMemo(() => {
    const boxWidthPx = boxW * PPI;
    return Math.max(8, Math.min(28, boxWidthPx / (charsPerLine * 0.55)));
  }, [boxW, charsPerLine]);

  /* ── Submitting ── */
  const [submitting, setSubmitting] = useState(false);

  const handleStart = useCallback(async () => {
    if (!filteredVerses.length) return;
    setSubmitting(true);

    const config: CanvasSessionConfig = {
      verses: filteredVerses.map((v) => ({ number: v.number, text: v.text })),
      verseRange,
      paper: { widthIn: paperWIn, heightIn: paperHIn },
      textBox: { x: boxX, y: boxY, width: boxW, height: boxH },
      typography: { charsPerLine, lineSpacing, fontSize },
      marginStyle,
      timerMinutes: timerEnabled ? timerMinutes : null,
    };

    // Insert study_sessions row if authenticated
    if (user) {
      try {
        const { data, error } = await supabase
          .from("study_sessions")
          .insert({
            user_id: user.id,
            book_usfm: bookUsfm,
            chapter_id: typeof selectedChapter?.id === "number" ? selectedChapter.id : chapterNum,
            verse_start: fromVerse,
            verse_end: toVerse,
            paper_width_px: paperWPx,
            paper_height_px: paperHPx,
            chars_per_line: charsPerLine,
            line_spacing: String(lineSpacing),
            margin_style: marginStyle,
            font_size_px: Math.round(fontSize),
            text_x: Math.round(boxX * PPI),
            text_y: Math.round(boxY * PPI),
            text_width_px: Math.round(boxW * PPI),
            elapsed_seconds: 0,
            status: "active",
            camera_x: 0,
            camera_y: 0,
            camera_scale: 1,
            camera_rotation: 0,
          })
          .select("id")
          .single();

        if (!error && data) {
          config.sessionId = data.id;
        }
      } catch (e) {
        console.error("Failed to create study session:", e);
      }
    }

    setSubmitting(false);
    onStartSession(config);
    onOpenChange(false);
  }, [filteredVerses, verseRange, paperWIn, paperHIn, paperWPx, paperHPx, boxX, boxY, boxW, boxH, charsPerLine, lineSpacing, fontSize, marginStyle, timerEnabled, timerMinutes, bookUsfm, selectedChapter, chapterNum, fromVerse, toVerse, user, onStartSession, onOpenChange]);

  if (!open) return null;

  /* ── Controls JSX ── */
  const controls = (
    <div className="space-y-6">
      {/* Section 1: Passage */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Passage</h3>
        <Select value={bookUsfm} onValueChange={(v) => { setBookUsfm(v); setChapterNum(0); setFromVerse(1); setToVerse(5); }}>
          <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-100 h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-64">{books?.map((b) => <SelectItem key={b.id} value={b.id}>{b.title}</SelectItem>)}</SelectContent>
        </Select>
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label className="text-zinc-400 text-xs">Chapter</Label>
            <Select value={String(chapterNum)} onValueChange={(v) => { setChapterNum(parseInt(v)); setFromVerse(1); setToVerse(5); }}>
              <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-100 h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-64">{selectedBook?.chapters?.map((ch, i) => <SelectItem key={ch.id} value={String(i)}>{ch.title}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-zinc-400 text-xs">From</Label>
            <Input type="number" min={1} max={maxVerse} value={fromVerse}
              onChange={(e) => setFromVerse(Math.max(1, Math.min(parseInt(e.target.value) || 1, toVerse)))}
              className="bg-zinc-900 border-zinc-700 text-zinc-100 h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-zinc-400 text-xs">To</Label>
            <Input type="number" min={fromVerse} max={maxVerse} value={toVerse}
              onChange={(e) => setToVerse(Math.max(fromVerse, Math.min(parseInt(e.target.value) || fromVerse, maxVerse)))}
              className="bg-zinc-900 border-zinc-700 text-zinc-100 h-9 text-sm" />
          </div>
        </div>
        <p className="text-xs text-zinc-500 italic">{verseRange}</p>
      </section>

      {/* Section 2: Paper */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Paper</h3>
        
        {/* Paper size presets */}
        <div className="grid grid-cols-2 gap-2">
          {PAPER_PRESETS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => setPresetIdx(i)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                presetIdx === i
                  ? "bg-amber-600/20 border-amber-500/50 text-amber-300"
                  : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-600"
              }`}
            >
              {p.label}
              {i < 3 && (
                <span className="block text-[0.6rem] opacity-60 mt-0.5">
                  {(p.widthPx / PPI).toFixed(1)}" × {(p.heightPx / PPI).toFixed(1)}"
                </span>
              )}
            </button>
          ))}
        </div>

        {presetIdx === 3 && (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-zinc-400 text-xs">Width (in)</Label>
              <Input type="number" min={4} max={17} step={0.5} value={customWIn}
                onChange={(e) => setCustomWIn(parseFloat(e.target.value) || 8.5)}
                className="bg-zinc-900 border-zinc-700 text-zinc-100 h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-zinc-400 text-xs">Height (in)</Label>
              <Input type="number" min={4} max={17} step={0.5} value={customHIn}
                onChange={(e) => setCustomHIn(parseFloat(e.target.value) || 11)}
                className="bg-zinc-900 border-zinc-700 text-zinc-100 h-9 text-sm" />
            </div>
          </div>
        )}

        {/* Chars per line */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-zinc-400 text-xs">Characters Per Line</Label>
            <span className="text-xs text-zinc-500 tabular-nums">~{charsPerLine} chars per line</span>
          </div>
          <Slider value={[charsPerLine]} onValueChange={([v]) => setCharsPerLine(v)}
            min={30} max={100} step={1}
            className="[&_[data-slot=track]]:bg-zinc-800 [&_[data-slot=range]]:bg-amber-500" />
        </div>

        {/* Line spacing presets */}
        <div className="space-y-1.5">
          <Label className="text-zinc-400 text-xs">Line Spacing</Label>
          <div className="grid grid-cols-4 gap-1.5">
            {SPACING_PRESETS.map((sp, i) => (
              <button
                key={sp.label}
                onClick={() => setLineSpacingIdx(i)}
                className={`px-2 py-1.5 rounded-lg text-[0.65rem] font-medium transition-all border ${
                  lineSpacingIdx === i
                    ? "bg-amber-600/20 border-amber-500/50 text-amber-300"
                    : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-600"
                }`}
              >
                {sp.label}
                <span className="block text-[0.55rem] opacity-60">{sp.value}×</span>
              </button>
            ))}
          </div>
        </div>

        {/* Margin style */}
        <div className="space-y-1.5">
          <Label className="text-zinc-400 text-xs">Paper Background</Label>
          <div className="grid grid-cols-3 gap-1.5">
            {MARGIN_STYLES.map((ms) => (
              <button
                key={ms.value}
                onClick={() => setMarginStyle(ms.value)}
                className={`px-2 py-1.5 rounded-lg text-[0.65rem] font-medium transition-all border ${
                  marginStyle === ms.value
                    ? "bg-amber-600/20 border-amber-500/50 text-amber-300"
                    : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-600"
                }`}
              >
                {ms.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3: Text Box Position (collapsible) */}
      <Collapsible>
        <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-semibold uppercase tracking-wider text-zinc-400 group">
          <span>Text Box Position</span>
          <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 space-y-3">
          <p className="text-[0.65rem] text-zinc-500 leading-snug">
            Drag the box in the preview to set where your text begins. Or set exact coordinates below.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-zinc-400 text-xs">Top (in)</Label>
              <Input type="number" min={0} max={paperHIn} step={0.25} value={boxY.toFixed(2)}
                onChange={(e) => setBoxY(Math.max(0, Math.min(paperHIn - 1, parseFloat(e.target.value) || 0)))}
                className="bg-zinc-900 border-zinc-700 text-zinc-100 h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-zinc-400 text-xs">Left (in)</Label>
              <Input type="number" min={0} max={paperWIn} step={0.25} value={boxX.toFixed(2)}
                onChange={(e) => setBoxX(Math.max(0, Math.min(paperWIn - 1, parseFloat(e.target.value) || 0)))}
                className="bg-zinc-900 border-zinc-700 text-zinc-100 h-9 text-sm" />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Section 4: Session Timer */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer className="h-3.5 w-3.5 text-zinc-400" />
            <Label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Timed Session</Label>
          </div>
          <Switch checked={timerEnabled} onCheckedChange={setTimerEnabled} />
        </div>
        {timerEnabled && (
          <div className="space-y-2">
            <div className="grid grid-cols-5 gap-1.5">
              {TIMER_PRESETS.map((m) => (
                <button
                  key={m}
                  onClick={() => { setTimerMinutes(m); setCustomTimer(false); }}
                  className={`px-2 py-1.5 rounded-lg text-[0.65rem] font-medium transition-all border ${
                    timerMinutes === m && !customTimer
                      ? "bg-amber-600/20 border-amber-500/50 text-amber-300"
                      : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-600"
                  }`}
                >
                  {m}m
                </button>
              ))}
              <button
                onClick={() => setCustomTimer(true)}
                className={`px-2 py-1.5 rounded-lg text-[0.65rem] font-medium transition-all border ${
                  customTimer
                    ? "bg-amber-600/20 border-amber-500/50 text-amber-300"
                    : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-600"
                }`}
              >
                Custom
              </button>
            </div>
            {customTimer && (
              <Input type="number" min={1} max={240} value={timerMinutes}
                onChange={(e) => setTimerMinutes(parseInt(e.target.value) || 30)}
                className="bg-zinc-900 border-zinc-700 text-zinc-100 h-9 text-sm w-24"
                placeholder="Minutes" />
            )}
          </div>
        )}
      </section>

      {/* iPadOS: Session timer integrates with BackgroundTasks framework (BGAppRefreshTask) */}

      {/* Begin Study CTA */}
      <button
        onClick={handleStart}
        disabled={!filteredVerses.length || submitting}
        className="w-full py-3.5 rounded-xl font-serif text-base font-semibold tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          background: "linear-gradient(135deg, hsl(38 92% 50%), hsl(30 80% 45%))",
          color: "#1a1410",
          boxShadow: "0 4px 20px -4px rgba(184, 92, 56, 0.4)",
        }}
      >
        {submitting ? "Preparing…" : "✦ Begin Study"}
      </button>
    </div>
  );

  /* ── Preview canvas ── */
  const tbLeft = boxX * PPI;
  const tbTop = boxY * PPI;
  const tbW = boxW * PPI;
  const tbH = boxH * PPI;

  const preview = (
    <div
      ref={previewRef}
      className="relative flex-1 flex items-center justify-center overflow-hidden"
      style={{ cursor: "crosshair" }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* Apple Pencil hover on preview shows crosshair cursor */}
      <div
        style={{
          width: paperWPx,
          height: paperHPx,
          transform: `scale(${previewScale})`,
          transformOrigin: "center center",
        }}
        className="bg-white rounded-sm shadow-2xl relative flex-shrink-0"
      >
        <MarginCanvasPreview style={marginStyle} />

        {/* Text Bounding Box */}
        <div
          style={{
            position: "absolute", left: tbLeft, top: tbTop, width: tbW, height: tbH,
          }}
          className="border-2 border-dashed border-amber-500/70 cursor-move overflow-hidden"
          onPointerDown={(e) => handlePointerDown(e, "drag")}
        >
          {HANDLES.map((h) => (
            <div key={h} style={getHandleStyle(h)} onPointerDown={(e) => handlePointerDown(e, "resize", h)} />
          ))}

          {/* Rendered verses */}
          <div
            className="p-2 select-none pointer-events-none"
            style={{
              fontFamily: "'EB Garamond', 'Georgia', serif",
              fontSize, lineHeight: `${fontSize * lineSpacing}px`,
              color: "#1a1a1a", wordBreak: "break-word",
            }}
          >
            {filteredVerses.map((v) => (
              <span key={v.number}>
                <sup className="font-sans text-zinc-400 mr-0.5" style={{ fontSize: fontSize * 0.6 }}>{v.number}</sup>
                {v.text}{" "}
              </span>
            ))}
            {!filteredVerses.length && (
              <span className="text-zinc-400 italic" style={{ fontSize: 14 }}>Select verses to preview…</span>
            )}
          </div>

          {/* Dimension badge */}
          <span
            className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-zinc-800/90 text-zinc-300 text-[0.6rem] px-2 py-0.5 rounded-full whitespace-nowrap font-mono"
          >
            {boxW.toFixed(1)}" × {boxH.toFixed(1)}"
          </span>
        </div>

        {/* Paper size label */}
        <span className="absolute bottom-1 right-2 text-zinc-400 font-mono select-none" style={{ fontSize: 10 }}>
          {paperWIn.toFixed(1)}" × {paperHIn.toFixed(1)}"
        </span>
      </div>
    </div>
  );

  /* ── Mobile: tabbed layout ── */
  if (isMobile) {
    return (
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <h2 className="text-base font-serif text-zinc-100">Canvas Studio</h2>
              <button onClick={() => onOpenChange(false)} className="text-zinc-400 hover:text-zinc-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <Tabs defaultValue="config" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="bg-zinc-900 mx-4 mt-2 grid grid-cols-2">
                <TabsTrigger value="config" className="text-xs">Config</TabsTrigger>
                <TabsTrigger value="preview" className="text-xs">Preview</TabsTrigger>
              </TabsList>

              <TabsContent value="config" className="flex-1 overflow-y-auto px-4 py-4">
                {controls}
              </TabsContent>

              <TabsContent value="preview" className="flex-1 bg-zinc-900">
                {preview}
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  /* ── Desktop: split screen ── */
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[100] flex"
        >
          {/* Left Pane — 45% */}
          <motion.div
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-[45%] min-w-[320px] max-w-[520px] bg-zinc-950 border-r border-zinc-800 flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <h2 className="text-lg font-serif text-zinc-100 tracking-tight">Canvas Studio</h2>
              <button onClick={() => onOpenChange(false)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5 scrollbar-thin scrollbar-thumb-zinc-800">
              {controls}
            </div>
          </motion.div>

          {/* Right Pane — 55% */}
          <div className="flex-1 bg-zinc-900 flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
              <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Live Preview</span>
              <span className="text-xs text-zinc-600 tabular-nums">{(previewScale * 100).toFixed(0)}% zoom</span>
            </div>
            {preview}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
