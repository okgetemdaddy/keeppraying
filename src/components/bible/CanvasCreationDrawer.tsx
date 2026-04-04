import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Maximize2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  useBibleChapterVerses,
  type BibleBookMeta,
  type NormalisedVerse,
} from "@/hooks/useBibleReader";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

/* ── Types ── */

export interface CanvasSessionConfig {
  verses: { number: number; text: string }[];
  verseRange: string;
  paper: { widthIn: number; heightIn: number };
  textBox: { x: number; y: number; width: number; height: number };
  typography: { charsPerLine: number; lineSpacing: number };
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

/* ── Paper presets ── */

const PAPER_PRESETS = [
  { label: "Letter (8.5 × 11)", width: 8.5, height: 11 },
  { label: "A4 (8.27 × 11.69)", width: 8.27, height: 11.69 },
  { label: "Square (8 × 8)", width: 8, height: 8 },
  { label: "Tabloid (11 × 17)", width: 11, height: 17 },
  { label: "Custom", width: 0, height: 0 },
] as const;

/* ── DPI for preview ── */
const PPI = 96;

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
    background: "hsl(217 91% 60%)", borderRadius: 1, zIndex: 10,
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

  /* ── Verse selection ── */
  const [bookUsfm, setBookUsfm] = useState(currentBookUsfm ?? "GEN");
  const [chapterNum, setChapterNum] = useState(currentChapterIdx ?? 0);
  const [fromVerse, setFromVerse] = useState(1);
  const [toVerse, setToVerse] = useState(5);

  // Sync defaults when drawer opens with new context
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

  const { data: allVerses } = useBibleChapterVerses(
    bibleId, bookUsfm, selectedChapter?.id, verseIds,
  );

  const filteredVerses = useMemo(() => {
    if (!allVerses) return [];
    return allVerses.filter((v) => v.number >= fromVerse && v.number <= toVerse);
  }, [allVerses, fromVerse, toVerse]);

  const maxVerse = allVerses?.length ?? 176;

  // Clamp toVerse when chapter changes
  useEffect(() => {
    if (allVerses && toVerse > allVerses.length) setToVerse(allVerses.length);
    if (allVerses && fromVerse > allVerses.length) setFromVerse(1);
  }, [allVerses]);

  /* ── Paper size ── */
  const [presetIdx, setPresetIdx] = useState(0);
  const [customW, setCustomW] = useState(8.5);
  const [customH, setCustomH] = useState(11);

  const paperW = presetIdx === 4 ? customW : PAPER_PRESETS[presetIdx].width;
  const paperH = presetIdx === 4 ? customH : PAPER_PRESETS[presetIdx].height;

  /* ── Typography ── */
  const [charsPerLine, setCharsPerLine] = useState(45);
  const [lineSpacing, setLineSpacing] = useState(2.0);

  /* ── Text box position/size in inches ── */
  const [boxX, setBoxX] = useState(0.75);
  const [boxY, setBoxY] = useState(0.75);
  const [boxW, setBoxW] = useState(() => paperW - 1.5);
  const [boxH, setBoxH] = useState(() => paperH - 1.5);

  // Reset box when paper changes
  useEffect(() => {
    const margin = 0.75;
    setBoxX(margin);
    setBoxY(margin);
    setBoxW(paperW - margin * 2);
    setBoxH(paperH - margin * 2);
  }, [paperW, paperH]);

  /* ── Preview scaling ── */
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(0.5);

  useEffect(() => {
    if (!previewRef.current || !open) return;
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      const pad = 48;
      const canvasPxW = paperW * PPI;
      const canvasPxH = paperH * PPI;
      const scale = Math.min((width - pad) / canvasPxW, (height - pad) / canvasPxH, 1);
      setPreviewScale(Math.max(0.1, scale));
    });
    obs.observe(previewRef.current);
    return () => obs.disconnect();
  }, [open, paperW, paperH]);

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
        type,
        handle,
        startX: e.clientX,
        startY: e.clientY,
        origBox: { x: boxX, y: boxY, w: boxW, h: boxH },
      };
    },
    [boxX, boxY, boxW, boxH],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!interaction.current) return;
      const { type, handle, startX, startY, origBox } = interaction.current;
      const dxPx = e.clientX - startX;
      const dyPx = e.clientY - startY;
      const dxIn = dxPx / (PPI * previewScale);
      const dyIn = dyPx / (PPI * previewScale);

      if (type === "drag") {
        setBoxX(Math.max(0, Math.min(paperW - origBox.w, origBox.x + dxIn)));
        setBoxY(Math.max(0, Math.min(paperH - origBox.h, origBox.y + dyIn)));
      } else if (type === "resize" && handle) {
        let nx = origBox.x, ny = origBox.y, nw = origBox.w, nh = origBox.h;
        const MIN_SIZE = 1; // inch

        if (handle.includes("e")) { nw = Math.max(MIN_SIZE, origBox.w + dxIn); }
        if (handle.includes("w")) { nx = origBox.x + dxIn; nw = Math.max(MIN_SIZE, origBox.w - dxIn); }
        if (handle.includes("s")) { nh = Math.max(MIN_SIZE, origBox.h + dyIn); }
        if (handle.includes("n")) { ny = origBox.y + dyIn; nh = Math.max(MIN_SIZE, origBox.h - dyIn); }

        // Clamp to canvas
        if (nx < 0) { nw += nx; nx = 0; }
        if (ny < 0) { nh += ny; ny = 0; }
        if (nx + nw > paperW) nw = paperW - nx;
        if (ny + nh > paperH) nh = paperH - ny;

        setBoxX(nx); setBoxY(ny); setBoxW(nw); setBoxH(nh);
      }
    },
    [previewScale, paperW, paperH],
  );

  const handlePointerUp = useCallback(() => {
    interaction.current = null;
  }, []);

  /* ── Verse range label ── */
  const verseRange = useMemo(() => {
    const bookName = selectedBook?.title ?? bookUsfm;
    const ch = (chapterNum + 1);
    if (fromVerse === toVerse) return `${bookName} ${ch}:${fromVerse}`;
    return `${bookName} ${ch}:${fromVerse}-${toVerse}`;
  }, [selectedBook, bookUsfm, chapterNum, fromVerse, toVerse]);

  /* ── Font size from chars per line ── */
  const fontSize = useMemo(() => {
    const boxWidthPx = boxW * PPI;
    // Average char width ≈ 0.55em for serif
    return Math.max(8, Math.min(28, boxWidthPx / (charsPerLine * 0.55)));
  }, [boxW, charsPerLine]);

  /* ── Start session ── */
  const handleStart = useCallback(() => {
    if (!filteredVerses.length) return;
    onStartSession({
      verses: filteredVerses.map((v) => ({ number: v.number, text: v.text })),
      verseRange,
      paper: { widthIn: paperW, heightIn: paperH },
      textBox: { x: boxX, y: boxY, width: boxW, height: boxH },
      typography: { charsPerLine, lineSpacing },
    });
    onOpenChange(false);
  }, [filteredVerses, verseRange, paperW, paperH, boxX, boxY, boxW, boxH, charsPerLine, lineSpacing, onStartSession, onOpenChange]);

  if (!open) return null;

  /* ── Left pane controls ── */
  const controls = (
    <div className="space-y-6">
      {/* Verse Selector */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Verses
        </h3>

        <div className="space-y-2">
          <Label className="text-zinc-400 text-xs">Book</Label>
          <Select value={bookUsfm} onValueChange={(v) => { setBookUsfm(v); setChapterNum(0); setFromVerse(1); setToVerse(5); }}>
            <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-100 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {books?.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label className="text-zinc-400 text-xs">Chapter</Label>
            <Select value={String(chapterNum)} onValueChange={(v) => { setChapterNum(parseInt(v)); setFromVerse(1); setToVerse(5); }}>
              <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-100 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {selectedBook?.chapters?.map((ch, i) => (
                  <SelectItem key={ch.id} value={String(i)}>{ch.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-zinc-400 text-xs">From</Label>
            <Input
              type="number"
              min={1}
              max={maxVerse}
              value={fromVerse}
              onChange={(e) => {
                const v = parseInt(e.target.value) || 1;
                setFromVerse(Math.max(1, Math.min(v, toVerse)));
              }}
              className="bg-zinc-900 border-zinc-700 text-zinc-100 h-9 text-sm"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-zinc-400 text-xs">To</Label>
            <Input
              type="number"
              min={fromVerse}
              max={maxVerse}
              value={toVerse}
              onChange={(e) => {
                const v = parseInt(e.target.value) || fromVerse;
                setToVerse(Math.max(fromVerse, Math.min(v, maxVerse)));
              }}
              className="bg-zinc-900 border-zinc-700 text-zinc-100 h-9 text-sm"
            />
          </div>
        </div>

        <p className="text-xs text-zinc-500 italic">{verseRange}</p>
      </section>

      {/* Paper Size */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Paper Size
        </h3>
        <Select
          value={String(presetIdx)}
          onValueChange={(v) => setPresetIdx(parseInt(v))}
        >
          <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-100 h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAPER_PRESETS.map((p, i) => (
              <SelectItem key={i} value={String(i)}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {presetIdx === 4 && (
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-zinc-400 text-xs">Width</Label>
                <span className="text-xs text-zinc-500 tabular-nums">{customW.toFixed(1)}"</span>
              </div>
              <Slider
                value={[customW]}
                onValueChange={([v]) => setCustomW(v)}
                min={4} max={17} step={0.25}
                className="[&_[data-slot=track]]:bg-zinc-800 [&_[data-slot=range]]:bg-blue-500"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-zinc-400 text-xs">Height</Label>
                <span className="text-xs text-zinc-500 tabular-nums">{customH.toFixed(1)}"</span>
              </div>
              <Slider
                value={[customH]}
                onValueChange={([v]) => setCustomH(v)}
                min={4} max={17} step={0.25}
                className="[&_[data-slot=track]]:bg-zinc-800 [&_[data-slot=range]]:bg-blue-500"
              />
            </div>
          </div>
        )}

        <p className="text-xs text-zinc-600">
          {paperW}" × {paperH}" &middot; {(paperW * paperH).toFixed(1)} sq in
        </p>
      </section>

      {/* Typography */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Typography
        </h3>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-zinc-400 text-xs">Characters Per Line</Label>
            <span className="text-xs text-zinc-500 tabular-nums">{charsPerLine}</span>
          </div>
          <Slider
            value={[charsPerLine]}
            onValueChange={([v]) => setCharsPerLine(v)}
            min={20} max={80} step={1}
            className="[&_[data-slot=track]]:bg-zinc-800 [&_[data-slot=range]]:bg-blue-500"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-zinc-400 text-xs">Line Spacing</Label>
            <span className="text-xs text-zinc-500 tabular-nums">{lineSpacing.toFixed(1)}×</span>
          </div>
          <Slider
            value={[lineSpacing]}
            onValueChange={([v]) => setLineSpacing(v)}
            min={1.0} max={3.0} step={0.1}
            className="[&_[data-slot=track]]:bg-zinc-800 [&_[data-slot=range]]:bg-blue-500"
          />
        </div>

        <p className="text-xs text-zinc-600">
          ~{fontSize.toFixed(0)}px font &middot; {(fontSize * lineSpacing).toFixed(0)}px line height
        </p>
      </section>

      {/* Start Session */}
      <Button
        onClick={handleStart}
        disabled={!filteredVerses.length}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-11"
      >
        Start Session
      </Button>
    </div>
  );

  /* ── Preview canvas ── */
  const canvasPxW = paperW * PPI;
  const canvasPxH = paperH * PPI;
  const tbLeft = boxX * PPI;
  const tbTop = boxY * PPI;
  const tbW = boxW * PPI;
  const tbH = boxH * PPI;

  const preview = (
    <div
      ref={previewRef}
      className="relative flex-1 flex items-center justify-center overflow-hidden"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* Scaled canvas */}
      <div
        style={{
          width: canvasPxW,
          height: canvasPxH,
          transform: `scale(${previewScale})`,
          transformOrigin: "center center",
        }}
        className="bg-white rounded-sm shadow-2xl relative flex-shrink-0"
      >
        {/* Text Bounding Box */}
        <div
          style={{
            position: "absolute",
            left: tbLeft,
            top: tbTop,
            width: tbW,
            height: tbH,
          }}
          className="border-2 border-dashed border-blue-500 cursor-move overflow-hidden"
          onPointerDown={(e) => handlePointerDown(e, "drag")}
        >
          {/* Resize handles */}
          {HANDLES.map((h) => (
            <div
              key={h}
              style={getHandleStyle(h)}
              onPointerDown={(e) => handlePointerDown(e, "resize", h)}
            />
          ))}

          {/* Rendered verses */}
          <div
            className="p-2 select-none pointer-events-none"
            style={{
              fontFamily: "'EB Garamond', 'Georgia', serif",
              fontSize,
              lineHeight: `${fontSize * lineSpacing}px`,
              color: "#1a1a1a",
              wordBreak: "break-word",
            }}
          >
            {filteredVerses.map((v) => (
              <span key={v.number}>
                <sup
                  className="font-sans text-zinc-400 mr-0.5"
                  style={{ fontSize: fontSize * 0.6 }}
                >
                  {v.number}
                </sup>
                {v.text}{" "}
              </span>
            ))}
            {!filteredVerses.length && (
              <span className="text-zinc-400 italic" style={{ fontSize: 14 }}>
                Select verses to preview…
              </span>
            )}
          </div>
        </div>

        {/* Corner dimension label */}
        <span
          className="absolute bottom-1 right-2 text-zinc-400 font-mono select-none"
          style={{ fontSize: 10 }}
        >
          {paperW}" × {paperH}"
        </span>
      </div>
    </div>
  );

  /* ── Mobile layout: stacked ── */
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
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <h2 className="text-base font-serif text-zinc-100">Create Canvas</h2>
              <button onClick={() => onOpenChange(false)} className="text-zinc-400 hover:text-zinc-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
              {/* Preview (compact) */}
              <div className="h-[45vh] bg-zinc-900 border-b border-zinc-800">
                {preview}
              </div>

              {/* Controls */}
              <div className="px-4 py-5">
                <Accordion type="multiple" defaultValue={["verses", "paper", "typography"]}>
                  <AccordionItem value="verses" className="border-zinc-800">
                    <AccordionTrigger className="text-zinc-300 text-sm hover:no-underline">Verses</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pt-1">{/* reuse verse controls */}
                        <Select value={bookUsfm} onValueChange={(v) => { setBookUsfm(v); setChapterNum(0); setFromVerse(1); setToVerse(5); }}>
                          <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-100 h-9 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent className="max-h-64">{books?.map((b) => <SelectItem key={b.id} value={b.id}>{b.title}</SelectItem>)}</SelectContent>
                        </Select>
                        <div className="grid grid-cols-3 gap-2">
                          <Select value={String(chapterNum)} onValueChange={(v) => { setChapterNum(parseInt(v)); setFromVerse(1); setToVerse(5); }}>
                            <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-100 h-9 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent className="max-h-64">{selectedBook?.chapters?.map((ch, i) => <SelectItem key={ch.id} value={String(i)}>{ch.title}</SelectItem>)}</SelectContent>
                          </Select>
                          <Input type="number" min={1} max={maxVerse} value={fromVerse} onChange={(e) => setFromVerse(Math.max(1, Math.min(parseInt(e.target.value) || 1, toVerse)))} className="bg-zinc-900 border-zinc-700 text-zinc-100 h-9 text-sm" />
                          <Input type="number" min={fromVerse} max={maxVerse} value={toVerse} onChange={(e) => setToVerse(Math.max(fromVerse, Math.min(parseInt(e.target.value) || fromVerse, maxVerse)))} className="bg-zinc-900 border-zinc-700 text-zinc-100 h-9 text-sm" />
                        </div>
                        <p className="text-xs text-zinc-500 italic">{verseRange}</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="paper" className="border-zinc-800">
                    <AccordionTrigger className="text-zinc-300 text-sm hover:no-underline">Paper Size</AccordionTrigger>
                    <AccordionContent>
                      <Select value={String(presetIdx)} onValueChange={(v) => setPresetIdx(parseInt(v))}>
                        <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-100 h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>{PAPER_PRESETS.map((p, i) => <SelectItem key={i} value={String(i)}>{p.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="typography" className="border-zinc-800">
                    <AccordionTrigger className="text-zinc-300 text-sm hover:no-underline">Typography</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between"><Label className="text-zinc-400 text-xs">Chars/Line</Label><span className="text-xs text-zinc-500">{charsPerLine}</span></div>
                          <Slider value={[charsPerLine]} onValueChange={([v]) => setCharsPerLine(v)} min={20} max={80} step={1} />
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between"><Label className="text-zinc-400 text-xs">Line Spacing</Label><span className="text-xs text-zinc-500">{lineSpacing.toFixed(1)}×</span></div>
                          <Slider value={[lineSpacing]} onValueChange={([v]) => setLineSpacing(v)} min={1.0} max={3.0} step={0.1} />
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                <div className="mt-5">
                  <Button onClick={handleStart} disabled={!filteredVerses.length} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-11">
                    Start Session
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  /* ── Desktop layout: split screen ── */
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
          {/* Left Pane — Controls */}
          <motion.div
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-[35%] min-w-[320px] max-w-[440px] bg-zinc-950 border-r border-zinc-800 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <h2 className="text-lg font-serif text-zinc-100 tracking-tight">
                Create Canvas
              </h2>
              <button
                onClick={() => onOpenChange(false)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable controls */}
            <div className="flex-1 overflow-y-auto px-5 py-5 scrollbar-thin scrollbar-thumb-zinc-800">
              {controls}
            </div>
          </motion.div>

          {/* Right Pane — Preview */}
          <div className="flex-1 bg-zinc-900 flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
              <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">
                Live Preview
              </span>
              <span className="text-xs text-zinc-600 tabular-nums">
                {(previewScale * 100).toFixed(0)}% zoom
              </span>
            </div>
            {preview}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
