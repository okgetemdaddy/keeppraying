import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  AlignJustify,
  List,
  BookmarkCheck,
  StickyNote,
  Package,
  Eye,
  EyeOff,
  AArrowDown,
  AArrowUp,
  Globe,
  PanelLeft,
  PanelRight,
  Maximize2,
  Minimize2,
  Search,
  PenTool,
  BookMarked,
  Download,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PixarLampIPadIcon } from "@/components/bible/PixarLampIPadIcon";
import { useIsMobile, useIsTouch } from "@/hooks/use-mobile";
import { useDeviceDetect } from "@/hooks/useDeviceDetect";
import { useBibleTextSize } from "@/hooks/useBibleTextSize";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Toggle } from "@/components/ui/toggle";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useBibleVersions,
  useBibleIndex,
  type BibleBookMeta,
  type NormalisedVerse,
} from "@/hooks/useBibleReader";
import {
  useBibleChapterData,
  type UserHighlight,
  type UserNote,
  type UserBookmark,
  type VerseBunchItemWithName,
} from "@/hooks/useBibleChapterData";
import { useBibleMutations, type ScriptureRef, type CrossBunchItem } from "@/hooks/useBibleMutations";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCrossTranslationAnnotations } from "@/hooks/useCrossTranslationAnnotations";
import { useBiblePosition, type BiblePosition } from "@/hooks/useBiblePosition";
import {
  FloatingToolbar,
  NoteInputPanel,
  type ToolbarPosition,
} from "@/components/bible/FloatingToolbar";
import {
  VerseBunchTooltip,
  isBunchAware,
  setBunchAware,
  loadPendingBunch,
  clearPendingBunch,
} from "@/components/bible/VerseBunchDialog";
import { VerseBunchStrip, useUserVerseBunches, type BunchWithCount } from "@/components/bible/VerseBunchStrip";
import { AddToBunchDrawer, VerseAddedToast } from "@/components/bible/AddToBunchDrawer";
import { SelectedVersesStrip, type SelectedVerse } from "@/components/bible/SelectedVersesStrip";
import { getBunchColor, BUNCH_COLOR_CLASSES } from "@/components/bible/bunchColors";
import { BibleSleeveSheet } from "@/components/bible/BibleSleeveSheet";

import { BibleSearchDialog } from "@/components/bible/BibleSearchDialog";
import { getBookmarkColorDef } from "@/components/bible/bookmarkColors";
import { useBoardPreferences } from "@/hooks/useBoardPreferences";
import { useImmersiveMode } from "@/hooks/useImmersiveMode";
import { ImmersiveExitPill } from "@/components/board/ImmersiveExitPill";
import { HandwritingEngine, type StrokeData } from "@/components/bible/HandwritingEngine";
import { ManuscriptCanvas } from "@/components/bible/ManuscriptCanvas";
import { JournalPanel } from "@/components/bible/JournalPanel";
import { InkOverlay, type InkStroke } from "@/components/bible/InkOverlay";
import { ZoomWrapper, type TextAlign, type CanvasBackground } from "@/components/bible/ZoomWrapper";
import { IPadStudyToolbar } from "@/components/bible/iPadStudyToolbar";
import { PaperCanvas } from "@/components/bible/PaperCanvas";
import { CanvasSetupSheet } from "@/components/bible/CanvasSetupSheet";
import { MobileStudyToolbar } from "@/components/bible/MobileStudyToolbar";
import { InkTrashSheet } from "@/components/bible/InkTrashSheet";
import { BiblePocketSheet } from "@/components/bible/BiblePocketSheet";
import { CrossReferencePopover } from "@/components/bible/CrossReferencePopover";
import { ReferenceBloom } from "@/components/bible/ReferenceBloom";
import { CanvasExportSheet } from "@/components/bible/CanvasExportSheet";
import { ChapterThumbnailStrip } from "@/components/bible/ChapterThumbnailStrip";
import { VoiceAnnotationOverlay } from "@/components/bible/VoiceAnnotationOverlay";
import { useInkHistory } from "@/hooks/useInkHistory";
import { useChapterAnnotations, useChapterInkAnnotations, useJournalAnnotations, useAnnotationMutations } from "@/hooks/useAnnotations";
import { toast } from "sonner";
import { IPadWaitlistDrawer } from "@/components/bible/iPadWaitlistDrawer";
import { BibleSuggestionSheet } from "@/components/bible/BibleSuggestionSheet";
import { BibleEdgeTabs } from "@/components/bible/BibleEdgeTabs";

type ReadingMode = "verse" | "paragraph";
type StudyModeVariant = "margin" | "canvas" | "journal";

const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.25 },
};

/* ── Dual-mode highlight styles ── */
export type HighlightStyleMode = "invert" | "neon";

const HIGHLIGHT_STYLES: Record<string, {
  light: string;
  darkInvert: string;
  darkNeon: { bg: string; border: string };
}> = {
  yellow: {
    light: "bg-yellow-200/70",
    darkInvert: "bg-[#FFD700] text-[#121212]",
    darkNeon: { bg: "bg-[#2A2A1A]", border: "border-b-2 border-[#FFD700]" },
  },
  green: {
    light: "bg-emerald-200/70",
    darkInvert: "bg-[#34D399] text-[#121212]",
    darkNeon: { bg: "bg-[#1A2A1F]", border: "border-b-2 border-[#34D399]" },
  },
  blue: {
    light: "bg-sky-200/70",
    darkInvert: "bg-[#38BDF8] text-[#121212]",
    darkNeon: { bg: "bg-[#1A222A]", border: "border-b-2 border-[#38BDF8]" },
  },
  pink: {
    light: "bg-pink-200/70",
    darkInvert: "bg-[#F472B6] text-[#121212]",
    darkNeon: { bg: "bg-[#2A1A22]", border: "border-b-2 border-[#F472B6]" },
  },
  purple: {
    light: "bg-violet-200/70",
    darkInvert: "bg-[#A78BFA] text-[#121212]",
    darkNeon: { bg: "bg-[#221A2A]", border: "border-b-2 border-[#A78BFA]" },
  },
  orange: {
    light: "bg-orange-200/70",
    darkInvert: "bg-[#FB923C] text-[#121212]",
    darkNeon: { bg: "bg-[#2A221A]", border: "border-b-2 border-[#FB923C]" },
  },
};

function getHighlightClass(color: string, mode: HighlightStyleMode): string {
  const style = HIGHLIGHT_STYLES[color] ?? HIGHLIGHT_STYLES.yellow;
  const isDark = document.documentElement.classList.contains("dark") ||
    document.documentElement.classList.contains("bible-dark");

  if (!isDark) return style.light;
  if (mode === "neon") return `${style.darkNeon.bg} ${style.darkNeon.border}`;
  return style.darkInvert;
}

/* ── Loading skeleton ── */
function ReadingSkeleton() {
  return (
    <div className="space-y-4 py-8">
      {Array.from({ length: 12 }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4 rounded"
          style={{ width: `${65 + Math.random() * 30}%` }}
        />
      ))}
    </div>
  );
}

/* ── Helper: build a lookup map by verse_number ── */
function groupByVerse<T extends { verse_number: number }>(items: T[]): Map<number, T[]> {
  const map = new Map<number, T[]>();
  for (const item of items) {
    const arr = map.get(item.verse_number) ?? [];
    arr.push(item);
    map.set(item.verse_number, arr);
  }
  return map;
}
/* ── Word-boundary snapping helper ── */
function snapToWordBoundaries(text: string, start: number, end: number): { start: number; end: number } {
  while (start > 0 && /\w/.test(text[start - 1])) start--;
  while (end < text.length && /\w/.test(text[end])) end++;
  return { start, end };
}

/* ── Highlighted text renderer (supports partial-verse spans) ── */
/* ── Word-wrapped text for hit testing (invisible layout-wise) ── */
function WordWrappedText({ text, verseNumber }: { text: string; verseNumber?: number }) {
  const segments = text.split(/(\s+)/);
  let wordIndex = 0;
  return (
    <>
      {segments.map((seg, i) => {
        if (/^\s+$/.test(seg)) {
          return <span key={`ws-${i}`}>{seg}</span>;
        }
        const idx = wordIndex++;
        return (
          <span
            key={`w-${i}`}
            data-word={seg}
            data-word-index={idx}
            data-verse={verseNumber}
          >
            {seg}
          </span>
        );
      })}
    </>
  );
}

function HighlightedText({
  text,
  highlights,
  highlightStyle = "invert",
  previewRange,
  verseNumber,
}: {
  text: string;
  highlights: UserHighlight[];
  highlightStyle?: HighlightStyleMode;
  previewRange?: { start: number; end: number };
  verseNumber?: number;
}) {
  if (!highlights.length && !previewRange) return <WordWrappedText text={text} verseNumber={verseNumber} />;
  // Build highlight spans
  const spans = highlights
    .map((h) => ({
      start: h.reference_normalized?.start ?? 0,
      end: h.reference_normalized?.end ?? text.length,
      color: h.color,
      isPreview: false,
    }))
    .sort((a, b) => a.start - b.start);

  // Insert preview span if it doesn't overlap existing highlights
  if (previewRange) {
    const overlaps = spans.some(
      (s) => s.start < previewRange.end && s.end > previewRange.start,
    );
    if (!overlaps) {
      spans.push({ start: previewRange.start, end: previewRange.end, color: "__preview__", isPreview: true });
      spans.sort((a, b) => a.start - b.start);
    }
  }

  const parts: React.ReactNode[] = [];
  let cursor = 0;

  for (let i = 0; i < spans.length; i++) {
    const span = spans[i];
    const start = Math.max(span.start, cursor);
    const end = Math.min(span.end, text.length);

    if (start > cursor) {
      parts.push(<WordWrappedText key={`gap-${cursor}`} text={text.slice(cursor, start)} verseNumber={verseNumber} />);
    }

    if (end > start) {
      if (span.isPreview) {
        parts.push(
          <mark key={`preview-${i}`} className="bg-primary/10 rounded-sm px-0.5 transition-colors">
            {text.slice(start, end)}
          </mark>,
        );
      } else {
        const colorClass = getHighlightClass(span.color, highlightStyle);
        parts.push(
          <mark key={`hl-${i}`} className={`${colorClass} rounded-sm px-0.5 transition-colors`}>
            {text.slice(start, end)}
          </mark>,
        );
      }
    }

    cursor = end;
  }

  if (cursor < text.length) {
    parts.push(<WordWrappedText key={`tail-${cursor}`} text={text.slice(cursor)} verseNumber={verseNumber} />);
  }

  return <>{parts}</>;
}

/* ── Inline note display ── */
function NoteMarginalia({ notes }: { notes: UserNote[] }) {
  const [expanded, setExpanded] = useState(false);

  if (!notes.length) return null;

  return (
    <span className="relative inline-flex items-center ml-1 align-middle">
      <button
        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800/50 transition-colors"
        aria-label={`${notes.length} note${notes.length > 1 ? "s" : ""}`}
        title="View note"
      >
        <StickyNote className="h-3 w-3" />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -4 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="absolute left-0 top-full z-20 mt-1 w-64 sm:w-80 rounded-lg border border-border bg-card p-3 shadow-lg"
          >
            {notes.map((note) => (
              <div key={note.id} className="text-sm text-card-foreground">
                <p className="whitespace-pre-wrap leading-relaxed">{note.note_content}</p>
                <p className="mt-1.5 text-[0.65rem] text-muted-foreground">
                  {new Date(note.updated_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}

/* ── Bookmark ribbon ── */
function BookmarkRibbon({ bookmark }: { bookmark?: UserBookmark }) {
  if (!bookmark) return null;
  const colorDef = getBookmarkColorDef(bookmark.color);
  return (
    <span className={`inline-flex items-center mr-0.5 ${colorDef.icon}`} title="Bookmarked">
      <BookmarkCheck className="h-3.5 w-3.5" />
    </span>
  );
}

/* ── Bunch indicator with color ── */
function BunchIndicator({ bunchItems, bunchColorMap }: { bunchItems: VerseBunchItemWithName[]; bunchColorMap: Map<string, number> }) {
  if (!bunchItems.length) return null;
  const names = [...new Set(bunchItems.map((b) => b.bunch_name))];
  // Use color of the first bunch
  const firstBunchId = bunchItems[0]?.bunch_id;
  const colorIdx = bunchColorMap.get(firstBunchId) ?? 0;
  const color = getBunchColor(colorIdx);
  const classes = BUNCH_COLOR_CLASSES[color];
  return (
    <span className="inline-flex items-center ml-1 align-middle" title={`In: ${names.join(", ")}`}>
      <span className={`inline-flex h-5 items-center gap-0.5 rounded-full ${classes.bg} px-1.5 text-[0.6rem] font-medium ${classes.text}`}>
        <Package className="h-3 w-3" />
        {names.length === 1 ? names[0] : `${names.length} bunches`}
      </span>
    </span>
  );
}

/* ── Enriched verse container ── */
interface EnrichedVerseProps {
  verse: NormalisedVerse;
  highlights: UserHighlight[];
  notes: UserNote[];
  bookmark?: UserBookmark;
  bunchItems: VerseBunchItemWithName[];
  bunchColorMap: Map<string, number>;
  bunchGroupPosition: "first" | "middle" | "last" | "single" | null;
  mode: ReadingMode;
  isSelected: boolean;
  hideBunches: boolean;
  onTapSelect: (verseNumber: number, e: React.MouseEvent) => void;
  studyMode?: boolean;
  verseAnnotation?: { id: string; strokes: StrokeData[] } | null;
  onAnnotationSave?: (verseId: string, strokes: StrokeData[], existingId?: string) => void;
  verseIdString?: string;
  highlightStyle?: HighlightStyleMode;
  previewRange?: { start: number; end: number };
  onLongPressVerseNumber?: (verseNumber: number) => void;
}

function EnrichedVerse({
  verse,
  highlights,
  notes,
  bookmark,
  bunchItems,
  bunchColorMap,
  bunchGroupPosition,
  mode,
  isSelected,
  hideBunches,
  onTapSelect,
  studyMode,
  verseAnnotation,
  onAnnotationSave,
  verseIdString,
  highlightStyle = "invert",
  previewRange,
  onLongPressVerseNumber,
}: EnrichedVerseProps) {
  const [showAnnotation, setShowAnnotation] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bunchBorderClass = useMemo(() => {
    if (!bunchGroupPosition || hideBunches) return "";
    const firstBunchId = bunchItems[0]?.bunch_id;
    const colorIdx = bunchColorMap.get(firstBunchId) ?? 0;
    const color = getBunchColor(colorIdx);
    const classes = BUNCH_COLOR_CLASSES[color];
    const base = `border-l-2 ${classes.border} pl-3`;
    switch (bunchGroupPosition) {
      case "first": return `${base} rounded-tl-md pt-2`;
      case "last": return `${base} rounded-bl-md pb-2`;
      case "middle": return base;
      case "single": return `${base} rounded-l-md py-1`;
      default: return "";
    }
  }, [bunchGroupPosition, hideBunches, bunchItems, bunchColorMap]);

  const bunchBgClass = useMemo(() => {
    if (!bunchGroupPosition || hideBunches) return "";
    const firstBunchId = bunchItems[0]?.bunch_id;
    const colorIdx = bunchColorMap.get(firstBunchId) ?? 0;
    const color = getBunchColor(colorIdx);
    return BUNCH_COLOR_CLASSES[color].bgSubtle;
  }, [bunchGroupPosition, hideBunches, bunchItems, bunchColorMap]);

  const selectedClass = isSelected
    ? "bg-primary/10 dark:bg-primary/15 ring-1 ring-primary/30 rounded-md"
    : "";

  if (mode === "paragraph") {
    return (
      <span
        id={`verse-${verse.number}`}
        data-verse={verse.number}
        className={`${bunchBgClass} ${selectedClass} cursor-pointer`}
        onClick={(e) => onTapSelect(verse.number, e)}
      >
        <sup
          className="mx-0.5 text-[0.65rem] font-semibold text-primary/60 select-none align-super"
          onPointerDown={() => {
            if (onLongPressVerseNumber) {
              longPressTimer.current = setTimeout(() => onLongPressVerseNumber(verse.number), 500);
            }
          }}
          onPointerUp={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
          onPointerLeave={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
          onPointerCancel={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
        >
          <BookmarkRibbon bookmark={bookmark} />
          {verse.number}
        </sup>
        <HighlightedText text={verse.text} highlights={highlights} highlightStyle={highlightStyle} previewRange={previewRange} verseNumber={verse.number} />
        <NoteMarginalia notes={notes} />
        {!hideBunches && <BunchIndicator bunchItems={bunchItems} bunchColorMap={bunchColorMap} />}{" "}
      </span>
    );
  }

  return (
    <div
      id={`verse-${verse.number}`}
      data-verse={verse.number}
      className={`verse group relative ${studyMode ? '' : 'leading-relaxed'} text-foreground ${bunchBorderClass} ${selectedClass} cursor-pointer px-1 -mx-1`}
      style={studyMode ? { lineHeight: `var(--verse-spacing, 2.8)`, paddingBlock: `calc((var(--verse-spacing, 2.8) - 1) * 0.25em)` } : undefined}
      onClick={(e) => onTapSelect(verse.number, e)}
    >
      <p>
        <BookmarkRibbon bookmark={bookmark} />
        {/* Annotation indicator (legacy per-verse) */}
        {verseAnnotation && !studyMode && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowAnnotation(!showAnnotation); }}
            className="inline-flex items-center justify-center h-4 w-4 mr-0.5 text-amber-600 hover:text-amber-700 align-middle"
            title="View handwritten note"
          >
            <PenTool className="h-3 w-3" />
          </button>
        )}
        <sup
          className="mr-1 text-xs font-semibold text-primary/70 select-none"
          onPointerDown={() => {
            if (onLongPressVerseNumber) {
              longPressTimer.current = setTimeout(() => onLongPressVerseNumber(verse.number), 500);
            }
          }}
          onPointerUp={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
          onPointerLeave={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
          onPointerCancel={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
        >
          {verse.number}
        </sup>
        <HighlightedText text={verse.text} highlights={highlights} highlightStyle={highlightStyle} previewRange={previewRange} verseNumber={verse.number} />
        <NoteMarginalia notes={notes} />
        {!hideBunches && <BunchIndicator bunchItems={bunchItems} bunchColorMap={bunchColorMap} />}
      </p>

      {/* Read-only annotation preview (when not in study mode) */}
      {showAnnotation && verseAnnotation && !studyMode && (
        <div className="mt-1 rounded-xl overflow-hidden border border-amber-200/40" style={{ height: 60 }}>
          <HandwritingEngine
            height={60}
            variant="margin"
            initialStrokes={verseAnnotation.strokes}
            showToolbar={false}
            className="pointer-events-none opacity-80"
          />
        </div>
      )}
    </div>
  );
}

/* ── Bunch position computation ── */
function computeBunchPositions(
  verses: NormalisedVerse[],
  bunchMap: Map<number, VerseBunchItemWithName[]>,
): Map<number, "first" | "middle" | "last" | "single" | null> {
  const positions = new Map<number, "first" | "middle" | "last" | "single" | null>();
  for (let i = 0; i < verses.length; i++) {
    const vn = verses[i].number;
    const hasBunch = (bunchMap.get(vn)?.length ?? 0) > 0;
    if (!hasBunch) { positions.set(vn, null); continue; }
    const prevVn = i > 0 ? verses[i - 1].number : -1;
    const nextVn = i < verses.length - 1 ? verses[i + 1].number : -1;
    const prevHas = (bunchMap.get(prevVn)?.length ?? 0) > 0;
    const nextHas = (bunchMap.get(nextVn)?.length ?? 0) > 0;
    if (!prevHas && !nextHas) positions.set(vn, "single");
    else if (!prevHas && nextHas) positions.set(vn, "first");
    else if (prevHas && nextHas) positions.set(vn, "middle");
    else positions.set(vn, "last");
  }
  return positions;
}

/* ── Helper: extract verse number from a DOM node ── */
function getVerseFromNode(node: Node | null): number | null {
  let el = node instanceof Element ? node : node?.parentElement;
  while (el) {
    const v = el.getAttribute?.("data-verse");
    if (v) return parseInt(v, 10);
    el = el.parentElement;
  }
  return null;
}

/* ── localStorage helpers ── */
function getHideBunches(): boolean {
  try { return localStorage.getItem("bible_hide_bunch_refs") === "true"; } catch { return false; }
}
function getCrossBunchTranslation(): boolean {
  try { return localStorage.getItem("bible_cross_bunch_translation") === "true"; } catch { return false; }
}

/* ═══════════════════════════════════════════════════
   MAIN BIBLE READER
   ═══════════════════════════════════════════════════ */
export function BibleReader() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { isIPad, isIPhone } = useDeviceDetect();
  const { size: textSize, setTextSize, MIN_SIZE, MAX_SIZE } = useBibleTextSize();
  const { prefs: boardPrefs, savePrefs: saveBoardPrefs } = useBoardPreferences();
  const { isSupported: immersiveSupported, isStandalone: immersiveStandalone, isIOSLimited: immersiveIOSLimited, isActive: immersiveActive, toggleImmersive } = useImmersiveMode(boardPrefs, saveBoardPrefs);
  const [versionId, setVersionId] = useState<number | undefined>(undefined);
  const [bookUsfm, setBookUsfm] = useState<string | undefined>(undefined);
  const [chapterIdx, setChapterIdx] = useState<number>(0);
  const [mode, setMode] = useState<ReadingMode>("verse");
  const [positionLoaded, setPositionLoaded] = useState(false);

  // ── Tap-to-navigate mode (iPhone swipe-free) ──
  const [tapNavMode, setTapNavMode] = useState<boolean>(() => {
    try { return localStorage.getItem("bible_tap_nav") === "true"; } catch { return false; }
  });
  const handleToggleTapNav = useCallback((v: boolean) => {
    setTapNavMode(v);
    try { localStorage.setItem("bible_tap_nav", v ? "true" : "false"); } catch {}
  }, []);

  // ── Position persistence ──
  const { loadPosition, savePosition } = useBiblePosition(user?.id);

  // ── Cross-book selection state ──
  const [crossSelections, setCrossSelections] = useState<SelectedVerse[]>([]);

  // ── Multi-select instruction tooltip ──
  const [showMultiSelectTip, setShowMultiSelectTip] = useState(false);
  const multiSelectTipShown = useRef(false);

  // ── Toolbar state ──
  const [toolbarPos, setToolbarPos] = useState<ToolbarPosition | null>(null);
  const [partialSelection, setPartialSelection] = useState<{
    verseNumber: number;
    start: number;
    end: number;
  } | null>(null);

  // ── Note input state ──
  const [noteInputVerse, setNoteInputVerse] = useState<number | null>(null);

  // ── Cross-reference popover state ──
  const [crossRefVerse, setCrossRefVerse] = useState<number | null>(null);
  const [crossRefOpen, setCrossRefOpen] = useState(false);

  // ── Reference Bloom state ──
  const [referenceBloom, setReferenceBloom] = useState<{ x: number; y: number; word: string; verseNumber: number } | null>(null);

  // ── Bunch dialog state ──
  const [showBunchDialog, setShowBunchDialog] = useState(false);
  const [bunchAwareState, setBunchAwareStateReact] = useState(isBunchAware);

  // ── Hide bunches toggle ──
  const [hideBunchRefs, setHideBunchRefs] = useState(getHideBunches);

  // ── Cross-bunch translation toggle ──
  const [crossBunchTranslation, setCrossBunchTranslation] = useState(getCrossBunchTranslation);

  // ── Cross-translation annotations ──
  const { enabled: crossTranslation, toggle: toggleCrossTranslation } = useCrossTranslationAnnotations();

  // ── Bible Sleeve sheet ──
  const [sleeveOpen, setSleeveOpen] = useState(false);

  // ── Canvas Export sheet ──
  const [exportSheetOpen, setExportSheetOpen] = useState(false);

  // ── Study artifacts for Bible Sleeve ──
  const [studyArtifacts, setStudyArtifacts] = useState<any[]>([]);
  useEffect(() => {
    if (!user) return;
    supabase
      .from("study_artifacts" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => { if (data) setStudyArtifacts(data as any[]); });
  }, [user]);

  // ── Premium Dark Mode ──
  const [premiumDark, setPremiumDark] = useState(() => {
    try { return localStorage.getItem("bible_premium_dark") === "true"; } catch { return false; }
  });
  const [oledMode, setOledMode] = useState(() => {
    try { return localStorage.getItem("bible_oled_mode") === "true"; } catch { return false; }
  });
  const handleTogglePremiumDark = useCallback((v: boolean) => {
    setPremiumDark(v);
    try { localStorage.setItem("bible_premium_dark", String(v)); } catch {}
    if (!v) {
      setOledMode(false);
      try { localStorage.setItem("bible_oled_mode", "false"); } catch {}
    }
  }, []);
  const handleToggleOled = useCallback((v: boolean) => {
    setOledMode(v);
    try { localStorage.setItem("bible_oled_mode", String(v)); } catch {}
  }, []);

  // ── Ease the Eyes dimmer ──
  const [easeEyesDim, setEaseEyesDim] = useState(() => {
    try { return parseFloat(localStorage.getItem("bible_ease_eyes") ?? "1"); } catch { return 1; }
  });
  const handleEaseEyesDimChange = useCallback((v: number) => {
    setEaseEyesDim(v);
    try { localStorage.setItem("bible_ease_eyes", String(v)); } catch {}
  }, []);

  // ── Ease the Eyes tint ──
  const [easeEyesTint, setEaseEyesTint] = useState(() => {
    try { return localStorage.getItem("bible_ease_tint") ?? "#f4f4f5"; } catch { return "#f4f4f5"; }
  });
  const handleEaseEyesTintChange = useCallback((hex: string) => {
    setEaseEyesTint(hex);
    try { localStorage.setItem("bible_ease_tint", hex); } catch {}
  }, []);

  // Sync ease-eyes-dim + tint to CSS variables — zero React re-renders on text
  useEffect(() => {
    document.documentElement.style.setProperty('--ease-eyes-dim', String(easeEyesDim));
    document.documentElement.style.setProperty('--ease-eyes-tint', easeEyesTint);
    return () => {
      document.documentElement.style.setProperty('--ease-eyes-dim', '1');
      document.documentElement.style.setProperty('--ease-eyes-tint', '#f4f4f5');
    };
  }, [easeEyesDim, easeEyesTint]);

  // ── Highlight style (invert vs neon) ──
  const [highlightStyle, setHighlightStyleRaw] = useState<HighlightStyleMode>(() => {
    try { return (localStorage.getItem("bible_highlight_style") as HighlightStyleMode) || "invert"; } catch { return "invert"; }
  });
  const handleHighlightStyleChange = useCallback((v: HighlightStyleMode) => {
    setHighlightStyleRaw(v);
    try { localStorage.setItem("bible_highlight_style", v); } catch {}
  }, []);

  // ── iPad Study Mode (handwritten annotations) ──
  const [studyMode, setStudyMode] = useState(() => {
    try { return localStorage.getItem("bible_study_mode") === "true"; } catch { return false; }
  });
  const [studyModeVariant, setStudyModeVariant] = useState<StudyModeVariant>(() => {
    try { return (localStorage.getItem("bible_study_variant") as StudyModeVariant) || "margin"; } catch { return "margin"; }
  });
  const [pencilDetected, setPencilDetected] = useState(false);
  const [canvasOpen, setCanvasOpen] = useState(false);
  const [canvasSetupOpen, setCanvasSetupOpen] = useState(false);
  const [journalOpen, setJournalOpen] = useState(false);

  // ── Ink overlay state (iPad SVG full-page drawing) ──
  const [inkZoom, setInkZoom] = useState(() => {
    try { return parseFloat(localStorage.getItem("bible_ink_zoom") ?? "1"); } catch { return 1; }
  });
  const [inkTextSpacing, setInkTextSpacing] = useState(() => {
    try { return parseFloat(localStorage.getItem("bible_ink_spacing") ?? "2.8"); } catch { return 2.8; }
  });
  const [inkPenColor, setInkPenColor] = useState("#1a1a1a");
  const [inkPenSize, setInkPenSize] = useState(8);
  const [inkPenGlow, setInkPenGlow] = useState<string | null>(() => {
    try { return localStorage.getItem("bible_pen_glow") || null; } catch { return null; }
  });
  const handleInkPenGlowChange = useCallback((v: string | null) => {
    setInkPenGlow(v);
    try { if (v) localStorage.setItem("bible_pen_glow", v); else localStorage.removeItem("bible_pen_glow"); } catch {}
  }, []);
  const [inkFingerDrawing, setInkFingerDrawing] = useState(false);
  const inkHistory = useInkHistory();

  // ── Workspace spatial settings ──
  const [wsTextAlign, setWsTextAlign] = useState<TextAlign>(() => {
    try { return (localStorage.getItem("bible_ws_align") as TextAlign) || "left"; } catch { return "left"; }
  });
  const [wsMarginWidth, setWsMarginWidth] = useState(() => {
    try { return parseFloat(localStorage.getItem("bible_ws_margin") ?? "30"); } catch { return 30; }
  });
  const [wsCanvasBackground, setWsCanvasBackground] = useState<CanvasBackground>(() => {
    try { return (localStorage.getItem("bible_ws_bg") as CanvasBackground) || "none"; } catch { return "none"; }
  });
  const handleWsTextAlign = useCallback((v: TextAlign) => {
    setWsTextAlign(v);
    try { localStorage.setItem("bible_ws_align", v); } catch {}
  }, []);
  const handleWsMarginWidth = useCallback((v: number) => {
    setWsMarginWidth(v);
    try { localStorage.setItem("bible_ws_margin", String(v)); } catch {}
  }, []);
  const handleWsCanvasBackground = useCallback((v: CanvasBackground) => {
    setWsCanvasBackground(v);
    try { localStorage.setItem("bible_ws_bg", v); } catch {}
  }, []);

  // New iPad feature states
  const [inkTrashOpen, setInkTrashOpen] = useState(false);
  const [voiceOverlayActive, setVoiceOverlayActive] = useState(false);
  const [pocketOpen, setPocketOpen] = useState(false);
  const [thumbnailStripOpen, setThumbnailStripOpen] = useState(false);
  const [eraserConfirmOpen, setEraserConfirmOpen] = useState(false);

  // ── Edge-swipe gestures: open Sleeve (left) & Pocket (right) ──
  const isTouch = useIsTouch();
  useEffect(() => {
    if (!isTouch) return;
    const EDGE = 24;
    const THRESHOLD = 60;
    let startX = 0;
    let latestX = 0;
    let zone: "sleeve" | "pocket" | null = null;

    const onTouchStart = (e: TouchEvent) => {
      if (studyMode || canvasOpen || journalOpen) return;
      const x = e.touches[0].clientX;
      if (x < EDGE) { zone = "sleeve"; startX = x; latestX = x; }
      else if (x > window.innerWidth - EDGE) { zone = "pocket"; startX = x; latestX = x; }
      else { zone = null; }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (zone) latestX = e.touches[0].clientX;
    };
    const onTouchEnd = () => {
      if (!zone) return;
      const delta = latestX - startX;
      if (zone === "sleeve" && delta > THRESHOLD) setSleeveOpen(true);
      if (zone === "pocket" && delta < -THRESHOLD) setPocketOpen(true);
      zone = null;
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [isTouch, studyMode, canvasOpen, journalOpen]);

  const handleInkZoomChange = useCallback((v: number) => {
    setInkZoom(v);
    try { localStorage.setItem("bible_ink_zoom", String(v)); } catch {}
  }, []);
  const handleInkTextSpacingChange = useCallback((v: number) => {
    setInkTextSpacing(v);
    try { localStorage.setItem("bible_ink_spacing", String(v)); } catch {}
  }, []);

  const handleToggleStudyMode = useCallback((v: boolean) => {
    if (v && studyModeVariant === "margin") {
      // Open setup sheet instead of immediately entering study mode
      setCanvasSetupOpen(true);
      return;
    }
    setStudyMode(v);
    try { localStorage.setItem("bible_study_mode", String(v)); } catch {}
    if (v && studyModeVariant === "canvas") setCanvasOpen(true);
    if (v && studyModeVariant === "journal") setJournalOpen(true);
    if (!v) { setCanvasOpen(false); setJournalOpen(false); }
  }, [studyModeVariant]);
  const handleStudyModeVariantChange = useCallback((v: StudyModeVariant) => {
    setStudyModeVariant(v);
    try { localStorage.setItem("bible_study_variant", v); } catch {}
    if (v === "canvas" && studyMode) { setCanvasOpen(true); setJournalOpen(false); }
    else if (v === "journal" && studyMode) { setJournalOpen(true); setCanvasOpen(false); }
    else { setCanvasOpen(false); setJournalOpen(false); }
  }, [studyMode]);

  // Auto-detect Apple Pencil — only on iPads
  useEffect(() => {
    if (!isIPad) return;
    const handler = (e: PointerEvent) => {
      if (e.pointerType === "pen" && !pencilDetected) {
        setPencilDetected(true);
        if (!studyMode) {
          handleToggleStudyMode(true);
          toast("🍎 Apple Pencil detected — Study Mode enabled", {
            description: "Write directly on the page alongside your verses",
          });
        }
      }
    };
    window.addEventListener("pointerdown", handler);
    return () => window.removeEventListener("pointerdown", handler);
  }, [isIPad, pencilDetected, studyMode, handleToggleStudyMode]);

  // ── Sync bible-dark / bible-oled classes to <html> so portaled content (dropdowns, sleeve) inherits ──
  useEffect(() => {
    const root = document.documentElement;
    const hadDarkBefore = root.classList.contains("dark");

    if (premiumDark) {
      root.classList.add("dark", "bible-dark");
      if (oledMode) root.classList.add("bible-oled");
      else root.classList.remove("bible-oled");
    } else {
      root.classList.remove("bible-dark", "bible-oled");
      if (!hadDarkBefore) {
        root.classList.remove("dark");
      }
    }

    return () => {
      root.classList.remove("bible-dark", "bible-oled");
      if (!hadDarkBefore) {
        root.classList.remove("dark");
      }
    };
  }, [premiumDark, oledMode]);

  // ── Active Bunch (session-only, resets on reload) ──
  const [activeBunchId, setActiveBunchId] = useState<string | null>(null);

  // ── Add to Bunch drawer ──
  const [addToBunchOpen, setAddToBunchOpen] = useState(false);

  // ── Floating "Verse Added" toast ──
  const [verseAddedToast, setVerseAddedToast] = useState<{ name: string; visible: boolean }>({ name: "", visible: false });

  const [searchOpen, setSearchOpen] = useState(false);
  const [waitlistDrawerOpen, setWaitlistDrawerOpen] = useState(false);
  const [suggestionDrawerOpen, setSuggestionDrawerOpen] = useState(false);

  // ── Focus mode (hide bottom nav) ──
  const [focusMode, setFocusMode] = useState(false);
  const toggleFocusMode = useCallback(() => {
    setFocusMode((prev) => {
      const next = !prev;
      window.dispatchEvent(new Event(next ? "tabbar:hide" : "tabbar:show"));
      return next;
    });
  }, []);
  // Restore tab bar on unmount
  useEffect(() => {
    return () => { window.dispatchEvent(new Event("tabbar:show")); };
  }, []);

  const readingAreaRef = useRef<HTMLDivElement>(null);
  // Data hooks
  const { data: versions, isLoading: versionsLoading } = useBibleVersions();
  const { data: index, isLoading: indexLoading } = useBibleIndex(versionId);
  const { data: bunches } = useUserVerseBunches();

  const currentBook: BibleBookMeta | undefined = useMemo(
    () => index?.books?.find((b) => b.id === bookUsfm),
    [index, bookUsfm],
  );
  const currentChapter = currentBook?.chapters?.[chapterIdx];
  const verseIds = useMemo(
    () => currentChapter?.verses?.map((v) => v.passage_id),
    [currentChapter],
  );

  const { data: chapterData, isLoading } = useBibleChapterData(
    versionId,
    bookUsfm,
    currentChapter?.id,
    verseIds,
    crossTranslation,
    crossBunchTranslation,
  );

  // ── Study Mode scroll behavior ──
  useEffect(() => {
    if (!studyMode || studyModeVariant !== "margin") return;
    const area = readingAreaRef.current;
    if (!area) return;
    area.style.overscrollBehavior = "none";
    return () => {
      area.style.overscrollBehavior = "";
    };
  }, [studyMode, studyModeVariant]);

  const verses = chapterData?.verses ?? [];
  const hasVerses = verses.length > 0;

  // ── Chapter annotations (handwriting) ──
  const { data: chapterAnnotations } = useChapterAnnotations(bookUsfm, currentChapter?.id);
  const { data: journalAnnotations } = useJournalAnnotations(bookUsfm, currentChapter?.id);
  const { data: inkAnnotation } = useChapterInkAnnotations(bookUsfm, currentChapter?.id);
  const { saveAnnotation: saveAnnotationMut, deleteAnnotation: deleteAnnotationMut } = useAnnotationMutations();

  // ── Load ink strokes from DB on chapter change ──
  const inkAnnotationId = inkAnnotation?.id;
  useEffect(() => {
    if (inkAnnotation) {
      inkHistory.replaceStrokes((inkAnnotation.strokes as unknown as InkStroke[]) ?? []);
    } else {
      inkHistory.replaceStrokes([]);
    }
  }, [inkAnnotation]);

  // ── Debounced ink auto-save ──
  const inkSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleInkSave = useCallback(
    (strokesToSave: InkStroke[]) => {
      if (inkSaveTimer.current) clearTimeout(inkSaveTimer.current);
      inkSaveTimer.current = setTimeout(() => {
        if (!bookUsfm || !currentChapter) return;
        const inkKey = `${bookUsfm}.${currentChapter.id}.ink`;
        saveAnnotationMut.mutate({
          verseIds: [inkKey],
          strokes: strokesToSave as unknown as StrokeData[],
          existingId: inkAnnotationId,
        });
      }, 500);
    },
    [bookUsfm, currentChapter, saveAnnotationMut, inkAnnotationId],
  );

  const handleInkStrokeComplete = useCallback(
    (stroke: InkStroke) => {
      inkHistory.addStroke(stroke);
      scheduleInkSave([...inkHistory.strokes, stroke]);
    },
    [inkHistory, scheduleInkSave],
  );

  const handleInkUndo = useCallback(() => {
    inkHistory.undo();
    // Save after undo — use the state that will exist after undo
    scheduleInkSave(inkHistory.strokes.slice(0, -1));
  }, [inkHistory, scheduleInkSave]);

  const handleInkRedo = useCallback(() => {
    inkHistory.redo();
  }, [inkHistory]);

  const handleInkClearRequest = useCallback(() => {
    if (inkHistory.strokes.length === 0) return;
    setEraserConfirmOpen(true);
  }, [inkHistory.strokes.length]);

  const handleInkClearConfirm = useCallback(() => {
    setEraserConfirmOpen(false);
    inkHistory.clearAll();
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(50);
    }
    scheduleInkSave([]);
  }, [inkHistory, scheduleInkSave]);


  // ── Voice annotation handler ──
  const handleVoiceTranscript = useCallback(
    (transcript: string, linkedVerse: number | null) => {
      if (!bookUsfm || !currentChapter || !user?.id) return;
      const verseKey = linkedVerse
        ? `${bookUsfm}.${currentChapter.id}.${linkedVerse}`
        : `${bookUsfm}.${currentChapter.id}.voice`;
      saveAnnotationMut.mutate({
        verseIds: [verseKey],
        strokes: [],
        typedText: `🎙️ ${transcript}`,
      });
      toast.success("Voice note saved", {
        description: linkedVerse ? `Linked to verse ${linkedVerse}` : "Saved to chapter",
      });
    },
    [bookUsfm, currentChapter, user?.id, saveAnnotationMut],
  );

  // Build a map: verseNumber → annotation (for legacy per-verse preview)
  const annotationMap = useMemo(() => {
    const map = new Map<number, { id: string; strokes: StrokeData[] }>();
    if (!chapterAnnotations || !bookUsfm || !currentChapter) return map;
    const prefix = `${bookUsfm}.${currentChapter.id}.`;
    for (const ann of chapterAnnotations) {
      for (const vid of ann.verse_ids) {
        if (vid.startsWith(prefix)) {
          const vn = parseInt(vid.slice(prefix.length), 10);
          if (!isNaN(vn)) {
            map.set(vn, { id: ann.id, strokes: ann.strokes as StrokeData[] });
          }
        }
      }
    }
    return map;
  }, [chapterAnnotations, bookUsfm, currentChapter]);

  const handleAnnotationSave = useCallback(
    (verseId: string, strokes: StrokeData[], existingId?: string) => {
      saveAnnotationMut.mutate({ verseIds: [verseId], strokes, existingId });
    },
    [saveAnnotationMut],
  );

  // Canvas-level annotation save (Mode 2) — saves all strokes for the whole chapter
  const canvasAnnotationId = useMemo(() => {
    if (!chapterAnnotations) return undefined;
    const chapterKey = bookUsfm && currentChapter ? `${bookUsfm}.${currentChapter.id}.canvas` : null;
    if (!chapterKey) return undefined;
    return chapterAnnotations.find((a) => a.verse_ids.includes(chapterKey))?.id;
  }, [chapterAnnotations, bookUsfm, currentChapter]);

  const canvasInitialStrokes = useMemo(() => {
    if (!chapterAnnotations || !bookUsfm || !currentChapter) return [];
    const chapterKey = `${bookUsfm}.${currentChapter.id}.canvas`;
    const ann = chapterAnnotations.find((a) => a.verse_ids.includes(chapterKey));
    return ann ? (ann.strokes as StrokeData[]) : [];
  }, [chapterAnnotations, bookUsfm, currentChapter]);

  const handleCanvasSave = useCallback(
    (strokes: StrokeData[]) => {
      if (!bookUsfm || !currentChapter) return;
      const chapterKey = `${bookUsfm}.${currentChapter.id}.canvas`;
      saveAnnotationMut.mutate({ verseIds: [chapterKey], strokes, existingId: canvasAnnotationId });
      toast.success("Canvas annotations saved ✨");
    },
    [saveAnnotationMut, bookUsfm, currentChapter, canvasAnnotationId],
  );

  const handleJournalSave = useCallback(
    (entry: { verseIds: string[]; strokes: StrokeData[]; svg?: string; typedText?: string; existingId?: string }) => {
      saveAnnotationMut.mutate({
        verseIds: entry.verseIds,
        strokes: entry.strokes,
        svg: entry.svg,
        typedText: entry.typedText,
        existingId: entry.existingId,
      });
      toast.success("Journal entry saved ✨");
    },
    [saveAnnotationMut],
  );

  // ── Pending scroll-to-verse (render-aware, replaces all setTimeout scroll patterns) ──
  const pendingScrollVerseRef = useRef<number | null>(null);
  const glowingElRef = useRef<HTMLElement | null>(null);
  const searchNavCounter = useRef(0);

  /** Remove glow from the previously-highlighted verse */
  const clearPreviousGlow = useCallback(() => {
    const prev = glowingElRef.current;
    if (prev) {
      prev.classList.remove("animate-verse-glow");
      prev.style.willChange = "auto";
      prev.removeAttribute("aria-current");
      glowingElRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (pendingScrollVerseRef.current == null) return;
    const verseNum = pendingScrollVerseRef.current;

    const tryScroll = () => {
      const el = document.getElementById(`verse-${verseNum}`);
      if (el) {
        // Cancel any previous glow before starting a new one
        clearPreviousGlow();

        el.scrollIntoView({ behavior: "smooth", block: "center" });

        // Wait for scroll to actually finish before applying glow
        let scrollTimeout: ReturnType<typeof setTimeout>;
        const scrollArea = readingAreaRef.current ?? window;

        const applyGlow = () => {
          clearPreviousGlow();
          el.style.willChange = "transform";
          el.setAttribute("aria-current", "true");
          el.classList.remove("animate-verse-glow");
          void el.offsetWidth; // force reflow to restart animation
          el.classList.add("animate-verse-glow");
          glowingElRef.current = el;

          const cleanup = () => {
            el.classList.remove("animate-verse-glow");
            el.style.willChange = "auto";
            el.removeAttribute("aria-current");
            if (glowingElRef.current === el) glowingElRef.current = null;
          };
          el.addEventListener("animationend", cleanup, { once: true });
          setTimeout(cleanup, 2500); // safety timeout
        };

        const onScrollEnd = () => {
          clearTimeout(scrollTimeout);
          scrollTimeout = setTimeout(() => {
            scrollArea.removeEventListener("scroll", onScrollEnd);
            applyGlow();
          }, 120); // 120ms debounce — scroll has settled
        };

        scrollArea.addEventListener("scroll", onScrollEnd, { passive: true });

        // Fallback: if no scroll event fires (element already in view)
        setTimeout(() => {
          scrollArea.removeEventListener("scroll", onScrollEnd);
          clearTimeout(scrollTimeout);
          applyGlow();
        }, 500);

        pendingScrollVerseRef.current = null;
        return true;
      }
      return false;
    };

    // Immediate attempt (covers most cases where effect fires after render)
    if (tryScroll()) return;

    // Fallback: MutationObserver watches for the element to appear
    const observer = new MutationObserver(() => {
      if (tryScroll()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Safety timeout to prevent leaks
    const timeout = setTimeout(() => {
      observer.disconnect();
      tryScroll(); // one last attempt
      pendingScrollVerseRef.current = null;
    }, 3000);

    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verses, searchNavCounter.current]);

  // Scripture ref for mutations
  const scriptureRef: ScriptureRef | null = useMemo(
    () =>
      versionId && bookUsfm && currentChapter
        ? { versionId, bookUsfm, chapterNumber: parseInt(currentChapter.id, 10) }
        : null,
    [versionId, bookUsfm, currentChapter],
  );

  const mutations = useBibleMutations(scriptureRef);

  // ── Bunch color map: bunch_id → index for stable coloring ──
  const bunchColorMap = useMemo(() => {
    const map = new Map<string, number>();
    (bunches ?? []).forEach((b, i) => map.set(b.id, i));
    return map;
  }, [bunches]);

  // Lookup maps
  const highlightMap = useMemo(() => groupByVerse(chapterData?.highlights ?? []), [chapterData?.highlights]);
  const noteMap = useMemo(() => groupByVerse(chapterData?.notes ?? []), [chapterData?.notes]);
  const bookmarkMap = useMemo(() => {
    const m = new Map<number, UserBookmark>();
    for (const b of chapterData?.bookmarks ?? []) m.set(b.verse_number, b);
    return m;
  }, [chapterData?.bookmarks]);
  const bunchMap = useMemo(() => groupByVerse(chapterData?.bunchItems ?? []), [chapterData?.bunchItems]);
  const bunchPositions = useMemo(() => computeBunchPositions(verses, bunchMap), [verses, bunchMap]);

  // ── X-gesture handler: delete highlights & ink under the X ──
  const handleXGesture = useCallback(
    (bbox: { minX: number; minY: number; maxX: number; maxY: number }) => {
      if (!user) {
        toast("Please sign in to edit highlights", {
          description: "Create a free account to save highlights and annotations",
        });
        return;
      }
      let highlightCount = 0;
      let strokeCount = 0;

      // Delete highlights under the X bbox
      const svgEl = readingAreaRef.current?.querySelector("svg") as SVGSVGElement | null;
      const svgRect = svgEl?.getBoundingClientRect();
      const z = studyMode ? (typeof inkZoom === "number" ? inkZoom : 1) : 1;

      if (svgRect) {
        const screenBbox = {
          left: bbox.minX * z + svgRect.left,
          top: bbox.minY * z + svgRect.top,
          right: bbox.maxX * z + svgRect.left,
          bottom: bbox.maxY * z + svgRect.top,
        };

        document.querySelectorAll("[data-verse]").forEach((el) => {
          const rect = el.getBoundingClientRect();
          const intersects =
            rect.left < screenBbox.right &&
            rect.right > screenBbox.left &&
            rect.top < screenBbox.bottom &&
            rect.bottom > screenBbox.top;

          if (intersects) {
            const vNum = parseInt(el.getAttribute("data-verse") ?? "", 10);
            if (!isNaN(vNum)) {
              const highlights = highlightMap.get(vNum) ?? [];
              highlights.forEach((h) => {
                mutations.removeHighlight.mutate(h.id);
                highlightCount++;
              });
            }
          }
        });
      }

      // Delete ink strokes whose bbox intersects the X bbox
      const strokesToRemove: string[] = [];
      inkHistory.strokes.forEach((s) => {
        const sMinX = Math.min(...s.points.map((p) => p.x));
        const sMaxX = Math.max(...s.points.map((p) => p.x));
        const sMinY = Math.min(...s.points.map((p) => p.y));
        const sMaxY = Math.max(...s.points.map((p) => p.y));

        const intersects =
          sMinX < bbox.maxX &&
          sMaxX > bbox.minX &&
          sMinY < bbox.maxY &&
          sMaxY > bbox.minY;

        if (intersects) strokesToRemove.push(s.id);
      });

      if (strokesToRemove.length > 0) {
        strokeCount = strokesToRemove.length;
        inkHistory.removeStrokes(strokesToRemove);
        const remaining = inkHistory.strokes.filter((s) => !strokesToRemove.includes(s.id));
        scheduleInkSave(remaining);
      }

      const parts: string[] = [];
      if (highlightCount > 0) parts.push(`${highlightCount} highlight${highlightCount > 1 ? "s" : ""}`);
      if (strokeCount > 0) parts.push(`${strokeCount} stroke${strokeCount > 1 ? "s" : ""}`);
      if (parts.length > 0) {
        toast.success(`Removed ${parts.join(" and ")}`, { icon: "✕" });
      }
    },
    [highlightMap, mutations, inkHistory, scheduleInkSave, studyMode],
  );

  // ── Derive current-chapter selection set from crossSelections ──
  const selectedVerses = useMemo(() => {
    const set = new Set<number>();
    for (const s of crossSelections) {
      if (
        s.bookUsfm === bookUsfm &&
        s.chapterNumber === currentChapter?.id &&
        s.versionId === versionId
      ) {
        set.add(s.verseNumber);
      }
    }
    return set;
  }, [crossSelections, bookUsfm, currentChapter?.id, versionId]);

  // Navigation
  const totalChapters = currentBook?.chapters?.length ?? 0;
  const canPrev = chapterIdx > 0;
  const canNext = chapterIdx < totalChapters - 1;

  // ── Load saved position on mount ──
  useEffect(() => {
    if (positionLoaded) return;
    if (!user?.id) {
      setPositionLoaded(true);
      return;
    }
    loadPosition().then((pos) => {
      if (pos) {
        setVersionId(pos.versionId);
        setBookUsfm(pos.bookUsfm);
        setChapterIdx(pos.chapterIdx);
        setMode(pos.mode);
        savedScrollRef.current = pos.scrollTop;
      }
      setPositionLoaded(true);
    });
  }, [user?.id, positionLoaded, loadPosition]);

  const savedScrollRef = useRef<number>(0);

  // ── Auto-select defaults only when no saved position ──
  useEffect(() => {
    if (versions?.length && !versionId && positionLoaded) {
      const niv = versions.find((v) => v.id === 111);
      const bsb = versions.find((v) => v.abbreviation === "BSB" || v.localized_abbreviation === "BSB");
      setVersionId(niv?.id ?? bsb?.id ?? versions[0].id);
    }
  }, [versions, versionId, positionLoaded]);

  useEffect(() => {
    if (index?.books?.length && !bookUsfm && positionLoaded) {
      setBookUsfm(index.books[0].id);
      setChapterIdx(0);
    }
  }, [index, bookUsfm, positionLoaded]);

  // ── Persist position on change ──
  useEffect(() => {
    if (!user?.id || !versionId || !bookUsfm || !positionLoaded) return;
    savePosition({ versionId, bookUsfm, chapterIdx, mode, scrollTop: 0 });
  }, [user?.id, versionId, bookUsfm, chapterIdx, mode, positionLoaded, savePosition]);

  // ── Restore scroll after verses load ──
  useEffect(() => {
    if (hasVerses && savedScrollRef.current > 0 && readingAreaRef.current) {
      const scrollTarget = savedScrollRef.current;
      savedScrollRef.current = 0;
      requestAnimationFrame(() => {
        readingAreaRef.current?.scrollTo({ top: scrollTarget });
      });
    }
  }, [hasVerses]);

  // ── Save scroll position on scroll (debounced) ──
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!user?.id || !versionId || !bookUsfm || !positionLoaded) return;
    const area = readingAreaRef.current;
    if (!area) return;
    const onScroll = () => {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = setTimeout(() => {
        savePosition({ versionId, bookUsfm, chapterIdx, mode, scrollTop: area.scrollTop });
      }, 1500);
    };
    area.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      area.removeEventListener("scroll", onScroll);
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, [user?.id, versionId, bookUsfm, chapterIdx, mode, positionLoaded, savePosition]);
  // Clear transient UI on chapter change (NOT selections)
  useEffect(() => {
    setToolbarPos(null);
    setPartialSelection(null);
    setNoteInputVerse(null);
    setShowBunchDialog(false);
  }, [versionId, bookUsfm, chapterIdx]);

  // ── Dismiss toolbar ──
  const dismissToolbar = useCallback(() => {
    setToolbarPos(null);
    setPartialSelection(null);
    // Clear current-chapter selections from crossSelections
    setCrossSelections((prev) =>
      prev.filter(
        (s) =>
          !(s.bookUsfm === bookUsfm && s.chapterNumber === currentChapter?.id && s.versionId === versionId),
      ),
    );
    window.getSelection()?.removeAllRanges();
  }, [bookUsfm, currentChapter?.id, versionId]);

  // ── Tap-select handler (cross-book aware) ──
  const handleTapSelectInner = useCallback(
    (verseNumber: number, e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest("button, a, input, textarea")) return;

      const sel = window.getSelection();
      if (sel && sel.toString().trim().length > 0) return;

      if (!versionId || !bookUsfm || !currentChapter || !currentBook) return;

      const newVerse: SelectedVerse = {
        versionId,
        bookUsfm,
        bookTitle: currentBook.title,
        chapterNumber: currentChapter.id,
        verseNumber,
      };

      const matchKey = (s: SelectedVerse) =>
        s.bookUsfm === bookUsfm &&
        s.chapterNumber === currentChapter.id &&
        s.verseNumber === verseNumber &&
        s.versionId === versionId;

      if (e.ctrlKey || e.metaKey) {
        setCrossSelections((prev) => {
          const exists = prev.find(matchKey);
          if (exists) return prev.filter((s) => !matchKey(s));
          return [...prev, newVerse];
        });
      } else if (e.shiftKey && selectedVerses.size > 0) {
        // Range select within current chapter
        const sorted = [...selectedVerses].sort((a, b) => a - b);
        const anchor = sorted[0];
        const start = Math.min(anchor, verseNumber);
        const end = Math.max(anchor, verseNumber);
        // Remove existing current-chapter selections, add range
        setCrossSelections((prev) => {
          const otherChapter = prev.filter(
            (s) =>
              !(s.bookUsfm === bookUsfm && s.chapterNumber === currentChapter.id && s.versionId === versionId),
          );
          const rangeVerses: SelectedVerse[] = [];
          for (let i = start; i <= end; i++) {
            rangeVerses.push({
              versionId,
              bookUsfm,
              bookTitle: currentBook.title,
              chapterNumber: currentChapter.id,
              verseNumber: i,
            });
          }
          return [...otherChapter, ...rangeVerses];
        });
      } else {
        // Single tap toggle
        setCrossSelections((prev) => {
          const exists = prev.find(matchKey);
          if (exists && crossSelections.length === 1) return [];
          if (exists) return prev.filter((s) => !matchKey(s));

          // Show multi-select tip on first selection (desktop only)
          if (!isMobile && !multiSelectTipShown.current) {
            try {
              const alreadySeen = localStorage.getItem("bible_multiselect_tip") === "true";
              if (!alreadySeen) {
                setShowMultiSelectTip(true);
                multiSelectTipShown.current = true;
                setTimeout(() => setShowMultiSelectTip(false), 5000);
              } else {
                multiSelectTipShown.current = true;
              }
            } catch {
              multiSelectTipShown.current = true;
            }
          }

          return [...prev, newVerse];
        });
      }

      setToolbarPos({
        x: Math.min(e.clientX, window.innerWidth - 200),
        y: Math.max(e.clientY - 60, 10),
      });
      setPartialSelection(null);
    },
    [versionId, bookUsfm, currentChapter, currentBook, selectedVerses, crossSelections.length],
  );

  const handleTapSelect = useCallback(
    (verseNumber: number, e: React.MouseEvent) => {
      handleTapSelectInner(verseNumber, e);
    },
    [handleTapSelectInner],
  );

  const handleReference = useCallback(
    (verseNumber: number, word?: string) => {
      const verseEl = document.getElementById(`verse-${verseNumber}`);
      const rect = verseEl?.getBoundingClientRect();
      const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
      const y = rect ? rect.bottom : window.innerHeight / 2;
      const verseText = verses.find((v) => v.number === verseNumber)?.text ?? "";
      setReferenceBloom({
        x,
        y,
        word: word || verseText.split(/\s+/).slice(0, 3).join(" "),
        verseNumber,
      });
    },
    [verses],
  );

  useEffect(() => {
    const area = readingAreaRef.current;
    if (!area) return;

    const handleMouseUp = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim()) return;

      const range = sel.getRangeAt(0);
      const startVerse = getVerseFromNode(range.startContainer);
      const endVerse = getVerseFromNode(range.endContainer);

      if (startVerse === null) return;

      const rect = range.getBoundingClientRect();
      const pos: ToolbarPosition = {
        x: Math.min(rect.left + rect.width / 2, window.innerWidth - 200),
        y: Math.max(rect.top - 60, 10),
      };

      if (startVerse === endVerse) {
        const verseEl = area.querySelector(`[data-verse="${startVerse}"]`);
        const textContent = verseEl?.textContent ?? "";
        const selectedText = sel.toString();
        const rawStart = Math.max(textContent.indexOf(selectedText), 0);
        const rawEnd = rawStart + selectedText.length;
        const snapped = snapToWordBoundaries(textContent, rawStart, rawEnd);
        setPartialSelection({
          verseNumber: startVerse,
          start: snapped.start,
          end: snapped.end,
        });
        // Add to crossSelections if not already
        if (versionId && bookUsfm && currentChapter && currentBook) {
          setCrossSelections((prev) => {
            const exists = prev.find(
              (s) => s.bookUsfm === bookUsfm && s.chapterNumber === currentChapter.id && s.verseNumber === startVerse && s.versionId === versionId,
            );
            if (exists) return prev;
            return [...prev, { versionId, bookUsfm, bookTitle: currentBook.title, chapterNumber: currentChapter.id, verseNumber: startVerse }];
          });
        }
      } else if (endVerse !== null) {
        const start = Math.min(startVerse, endVerse);
        const end = Math.max(startVerse, endVerse);
        if (versionId && bookUsfm && currentChapter && currentBook) {
          setCrossSelections((prev) => {
            const otherChapter = prev.filter(
              (s) => !(s.bookUsfm === bookUsfm && s.chapterNumber === currentChapter.id && s.versionId === versionId),
            );
            const rangeVerses: SelectedVerse[] = [];
            for (let i = start; i <= end; i++) {
              rangeVerses.push({ versionId, bookUsfm, bookTitle: currentBook.title, chapterNumber: currentChapter.id, verseNumber: i });
            }
            return [...otherChapter, ...rangeVerses];
          });
        }
        setPartialSelection(null);
      }

      setToolbarPos(pos);
    };

    area.addEventListener("mouseup", handleMouseUp);
    area.addEventListener("touchend", handleMouseUp);
    return () => {
      area.removeEventListener("mouseup", handleMouseUp);
      area.removeEventListener("touchend", handleMouseUp);
    };
  }, [versionId, bookUsfm, currentChapter, currentBook]);

  // ── Toolbar action handlers ──
  const handleHighlight = useCallback(
    (color: string, verseNumber: number, start?: number, end?: number) => {
      mutations.addHighlight.mutate({ verseNumber, color, start, end });
    },
    [mutations.addHighlight],
  );

  const handleToggleBookmark = useCallback(
    (verseNumber: number, color: string, existingId?: string) => {
      mutations.toggleBookmark.mutate({ verseNumber, color, existingId });
    },
    [mutations.toggleBookmark],
  );

  const handleAddNote = useCallback(
    (verseNumber: number) => {
      setNoteInputVerse(verseNumber);
    },
    [],
  );

  const handleCrossRef = useCallback(
    (verseNumber: number) => {
      setCrossRefVerse(verseNumber);
      setCrossRefOpen(true);
    },
    [],
  );

  const handleSaveNote = useCallback(
    (content: string, existingId?: string) => {
      if (noteInputVerse === null) return;
      mutations.saveNote.mutate({
        verseNumber: noteInputVerse,
        content,
        existingId,
      });
      setNoteInputVerse(null);
    },
    [noteInputVerse, mutations.saveNote],
  );

  // ── Auto-show tooltip when 2+ cross-selections and user hasn't acknowledged ──
  useEffect(() => {
    if (crossSelections.length >= 2 && !bunchAwareState && !showBunchDialog) {
      setShowBunchDialog(true);
    }
  }, [crossSelections.length, bunchAwareState, showBunchDialog]);

  // ── Dismiss handler (sets both localStorage and React state) ──
  const handleBunchDismiss = useCallback(() => {
    setShowBunchDialog(false);
    setBunchAware(); // localStorage
    setBunchAwareStateReact(true); // React state — prevents auto-show
  }, []);

  const handleCreateBunchRequest = useCallback(() => {
    if (crossSelections.length < 2) return;
    setShowBunchDialog(true);
  }, [crossSelections.length]);

  const handleBunchConfirm = useCallback(
    (bunchName: string, description?: string) => {
      const items: CrossBunchItem[] = crossSelections.map((s) => ({
        versionId: s.versionId,
        bookUsfm: s.bookUsfm,
        chapterNumber: parseInt(s.chapterNumber, 10),
        verseNumber: s.verseNumber,
      }));
      mutations.createBunch.mutate({ bunchName, items, description });
      setShowBunchDialog(false);
      setCrossSelections([]);
      setToolbarPos(null);
    },
    [crossSelections, mutations.createBunch],
  );

  const handleAddToExistingBunch = useCallback(
    (bunchId: string, bunchName: string) => {
      const items: CrossBunchItem[] = crossSelections.map((s) => ({
        versionId: s.versionId,
        bookUsfm: s.bookUsfm,
        chapterNumber: parseInt(s.chapterNumber, 10),
        verseNumber: s.verseNumber,
      }));
      mutations.addToBunch.mutate({ bunchId, bunchName, items });
      setShowBunchDialog(false);
      setCrossSelections([]);
      setToolbarPos(null);
    },
    [crossSelections, mutations.addToBunch],
  );

  // ── Pending bunch recovery after sign-in ──
  useEffect(() => {
    if (!user) return;
    const pending = loadPendingBunch();
    if (!pending) return;
    clearPendingBunch();
    const items: CrossBunchItem[] = pending.verseNumbers.map((vn) => ({
      versionId: pending.versionId,
      bookUsfm: pending.bookUsfm,
      chapterNumber: parseInt(pending.chapterNumber, 10),
      verseNumber: vn,
    }));
    mutations.createBunch.mutate({
      bunchName: `${pending.bookUsfm} ${pending.chapterNumber}:${pending.verseNumbers[0]}–${pending.verseNumbers[pending.verseNumbers.length - 1]}`,
      items,
    });
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Navigate to a bunch ──
  const handleNavigateToBunch = useCallback(
    (bunch: BunchWithCount) => {
      if (!bunch.first_version_id || !bunch.first_book_usfm || bunch.first_chapter === null) return;
      setVersionId(bunch.first_version_id);
      setBookUsfm(bunch.first_book_usfm);
      const book = index?.books?.find((b) => b.id === bunch.first_book_usfm);
      const chIdx = book?.chapters?.findIndex((ch) => ch.id === String(bunch.first_chapter)) ?? 0;
      setChapterIdx(Math.max(chIdx, 0));
      if (bunch.first_verse) {
        pendingScrollVerseRef.current = bunch.first_verse;
      }
    },
    [index],
  );

  // ── Navigate to a specific verse from bunch strip ──
  const handleNavigateToVerse = useCallback(
    (targetVersionId: number, targetBookUsfm: string, chapter: number, verse: number) => {
      setVersionId(targetVersionId);
      setBookUsfm(targetBookUsfm);
      const book = index?.books?.find((b) => b.id === targetBookUsfm);
      const chIdx = book?.chapters?.findIndex((ch) => ch.id === String(chapter)) ?? 0;
      setChapterIdx(Math.max(chIdx, 0));
      pendingScrollVerseRef.current = verse;
    },
    [index],
  );

  // ── Add to Bunch flow ──
  const handleAddToBunchRequest = useCallback(() => {
    setAddToBunchOpen(true);
  }, []);

  const handleAddToBunchConfirm = useCallback(
    (bunchId: string, bunchName: string) => {
      const items: CrossBunchItem[] = crossSelections.map((s) => ({
        versionId: s.versionId,
        bookUsfm: s.bookUsfm,
        chapterNumber: parseInt(s.chapterNumber, 10),
        verseNumber: s.verseNumber,
      }));
      mutations.addToBunch.mutate({ bunchId, bunchName, items });
      setAddToBunchOpen(false);
      setCrossSelections([]);
      setToolbarPos(null);

      // If adding to the latest bunch, switch label to Active
      const newest = bunches?.[0];
      if (newest && bunchId === newest.id) {
        setActiveBunchId(bunchId);
      }

      // Show floating toast
      setVerseAddedToast({ name: bunchName, visible: true });
      setTimeout(() => setVerseAddedToast((prev) => ({ ...prev, visible: false })), 2500);
    },
    [crossSelections, mutations.addToBunch, bunches],
  );

  // ── Set active bunch (from Sleeve context menu) ──
  const handleSetActiveBunch = useCallback((bunchId: string) => {
    setActiveBunchId(bunchId);
  }, []);

  // ── Delete bunch ──
  const handleDeleteBunch = useCallback(
    (bunchId: string) => {
      mutations.deleteBunch.mutate(bunchId);
      if (activeBunchId === bunchId) setActiveBunchId(null);
    },
    [mutations.deleteBunch, activeBunchId],
  );


  const handleSearchNavigate = useCallback(
    (searchBookUsfm: string, chapter: number, verse?: number) => {
      setBookUsfm(searchBookUsfm);
      const book = index?.books?.find((b) => b.id === searchBookUsfm);
      const chIdx = book?.chapters?.findIndex((ch) => ch.id === String(chapter)) ?? 0;
      setChapterIdx(Math.max(chIdx, 0));
      if (verse) {
        pendingScrollVerseRef.current = verse;
        searchNavCounter.current += 1;
      }
    },
    [index],
  );

  // ── Navigate to a selected verse from strip ──
  const handleNavigateToSelection = useCallback(
    (v: SelectedVerse) => {
      if (v.versionId !== versionId) setVersionId(v.versionId);
      if (v.bookUsfm !== bookUsfm) setBookUsfm(v.bookUsfm);
      const book = index?.books?.find((b) => b.id === v.bookUsfm);
      const chIdx = book?.chapters?.findIndex((ch) => ch.id === v.chapterNumber) ?? 0;
      setChapterIdx(Math.max(chIdx, 0));
      pendingScrollVerseRef.current = v.verseNumber;
    },
    [index, versionId, bookUsfm],
  );

  // ── Remove a selection from the strip ──
  const handleRemoveSelection = useCallback((v: SelectedVerse) => {
    setCrossSelections((prev) =>
      prev.filter(
        (s) =>
          !(s.bookUsfm === v.bookUsfm && s.chapterNumber === v.chapterNumber && s.verseNumber === v.verseNumber && s.versionId === v.versionId),
      ),
    );
  }, []);

  // ── Toggle hide bunches ──
  const toggleHideBunches = useCallback(() => {
    setHideBunchRefs((prev) => {
      const next = !prev;
      try { localStorage.setItem("bible_hide_bunch_refs", String(next)); } catch {}
      return next;
    });
  }, []);

  // ── Toggle cross-bunch translation ──
  const toggleCrossBunchTranslation = useCallback(() => {
    setCrossBunchTranslation((prev) => {
      const next = !prev;
      try { localStorage.setItem("bible_cross_bunch_translation", String(next)); } catch {}
      return next;
    });
  }, []);

  // ── Determine toolbar context ──
  const selectedArr = useMemo(() => [...selectedVerses].sort((a, b) => a - b), [selectedVerses]);
  const primaryVerse = selectedArr[0];
  const primaryBookmark = primaryVerse ? bookmarkMap.get(primaryVerse) : undefined;

  // Derive existing highlight color/id for primary verse (for unhighlight X)
  const primaryHighlights = primaryVerse ? highlightMap.get(primaryVerse) ?? [] : [];
  const existingHighlightColor = primaryHighlights.length === 1 ? primaryHighlights[0].color : undefined;
  const existingHighlightId = primaryHighlights.length === 1 ? primaryHighlights[0].id : undefined;

  // Compute used bookmark colors for the "+" auto-assign
  const usedBookmarkColors = useMemo(() => {
    const set = new Set<string>();
    for (const b of chapterData?.bookmarks ?? []) set.add(b.color);
    return set;
  }, [chapterData?.bookmarks]);

  const handleRemoveHighlight = useCallback(
    (highlightId: string) => {
      mutations.removeHighlight.mutate(highlightId);
    },
    [mutations.removeHighlight],
  );

  return (
    <article className={`min-h-screen bg-background transition-colors duration-300 ${premiumDark ? 'bible-dark' : ''} ${premiumDark && oledMode ? 'bible-oled' : ''}`}>
      {/* ── Verse Bunch strip (saved bunches) ── */}
      {!hideBunchRefs && (
        <VerseBunchStrip
          onNavigateToBunch={handleNavigateToBunch}
          onNavigateToVerse={handleNavigateToVerse}
          activeBunchId={activeBunchId}
        />
      )}

      {/* ── Selected verses strip (active selections) ── */}
      <SelectedVersesStrip
        selections={crossSelections}
        onRemove={handleRemoveSelection}
        onNavigate={handleNavigateToSelection}
        onCreateBunch={handleCreateBunchRequest}
      />

      {/* ── Toolbar ── */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm relative">
        {/* Edge Tabs — Suggestions & iPad Waitlist */}
        <BibleEdgeTabs
          onSuggestionsClick={() => setSuggestionDrawerOpen(true)}
          onIPadClick={() => setWaitlistDrawerOpen(true)}
          showIPad={!isIPhone}
          hidden={focusMode}
        />
        <div className="mx-auto max-w-3xl px-4 py-2 space-y-1.5">
          {/* ── Row 1: Version · Book · Chapter ── */}
          <div className="flex items-center gap-2">
            <Select
              value={versionId?.toString()}
              onValueChange={(v) => {
                setVersionId(Number(v));
                setBookUsfm(undefined);
                setChapterIdx(0);
              }}
            >
              <SelectTrigger className="w-[130px] text-xs sm:text-sm">
                <SelectValue placeholder={versionsLoading ? "Loading…" : "Version"} />
              </SelectTrigger>
              <SelectContent>
                {versions?.map((v, i) => {
                  const FEATURED_IDS = new Set([111, 110]);
                  const isBSB = v.abbreviation === "BSB" || v.localized_abbreviation === "BSB";
                  const isFeatured = FEATURED_IDS.has(v.id) || isBSB;
                  const nextV = versions[i + 1];
                  const nextIsFeatured = nextV
                    ? FEATURED_IDS.has(nextV.id) || nextV.abbreviation === "BSB" || nextV.localized_abbreviation === "BSB"
                    : false;
                  const showSep = isFeatured && !nextIsFeatured && i < versions.length - 1;

                  return (
                    <React.Fragment key={v.id}>
                      <SelectItem value={v.id.toString()}>
                        {v.id === 110 ? "For Kids" : v.localized_abbreviation}
                      </SelectItem>
                      {showSep && <SelectSeparator />}
                    </React.Fragment>
                  );
                })}
              </SelectContent>
            </Select>

            <Select
              value={bookUsfm}
              onValueChange={(v) => { setBookUsfm(v); setChapterIdx(0); }}
              disabled={!index}
            >
              <SelectTrigger className="w-[140px] sm:w-[170px] text-xs sm:text-sm">
                <SelectValue placeholder={indexLoading ? "Loading…" : "Book"} />
              </SelectTrigger>
              <SelectContent>
                {index?.books?.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={chapterIdx.toString()}
              onValueChange={(v) => setChapterIdx(Number(v))}
              disabled={!currentBook}
            >
              <SelectTrigger className="w-[80px] text-xs sm:text-sm">
                <SelectValue placeholder="Ch" />
              </SelectTrigger>
              <SelectContent>
                {currentBook?.chapters?.map((ch, i) => (
                  <SelectItem key={ch.id} value={i.toString()}>{ch.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

            {/* ── Row 2: Sleeve · flex · selection count · text size · reading mode ── */}
          <div className="flex items-center gap-2">
            {/* Bible Sleeve button (left) */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSleeveOpen(true)}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              title="Your Bible Sleeve"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>

            {/* Study Mode (iPad/Pencil) */}
            <Button
              variant={studyMode ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                if (studyMode && studyModeVariant === "canvas") {
                  setCanvasOpen(!canvasOpen);
                } else if (studyMode && studyModeVariant === "journal") {
                  setJournalOpen(!journalOpen);
                } else {
                  handleToggleStudyMode(!studyMode);
                }
              }}
              className={`h-8 w-8 p-0 overflow-visible ${studyMode ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              title={studyMode ? (studyModeVariant === "canvas" ? "Open Canvas" : "Exit Study Mode") : "iPad Study Mode"}
            >
              <PixarLampIPadIcon className="!h-full !w-full" />
            </Button>

            {/* Export Canvas (visible in study mode) */}
            {studyMode && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExportSheetOpen(true)}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                title="Export Canvas"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}


            {/* Focus mode toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFocusMode}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              title={focusMode ? "Show navigation" : "Focus mode"}
            >
              {focusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>

            {/* Inline search input */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="What can I help you find?"
                className="h-8 w-[240px] focus:w-80 transition-all duration-200 pl-7 text-xs rounded-md bg-muted/50 border-transparent focus:border-input"
                onFocus={() => setSearchOpen(true)}
                readOnly
              />
            </div>

            <div className="flex-1" />

            {/* Selection indicator */}
            {crossSelections.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {crossSelections.length} verse{crossSelections.length > 1 ? "s" : ""} selected
              </span>
            )}

            {/* Text size control */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                  title="Text size"
                >
                  <AArrowUp className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-3" align="end">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <AArrowDown className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-foreground">{textSize}px</span>
                    <AArrowUp className="h-4.5 w-4.5 text-muted-foreground" />
                  </div>
                  <Slider
                    value={[textSize]}
                    min={MIN_SIZE}
                    max={MAX_SIZE}
                    step={1}
                    onValueChange={([v]) => setTextSize(v)}
                    className="w-full"
                  />
                </div>
              </PopoverContent>
            </Popover>

            {/* Reading mode toggle */}
            <div className="flex items-center rounded-lg border border-border bg-muted/50 p-0.5">
              <Toggle
                pressed={mode === "verse"}
                onPressedChange={() => setMode("verse")}
                size="sm"
                className="h-7 w-7 p-0 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                aria-label="Verse-by-verse mode"
              >
                <List className="h-3.5 w-3.5" />
              </Toggle>
              <Toggle
                pressed={mode === "paragraph"}
                onPressedChange={() => setMode("paragraph")}
                size="sm"
                className="h-7 w-7 p-0 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                aria-label="Paragraph mode"
              >
                <AlignJustify className="h-3.5 w-3.5" />
              </Toggle>
            </div>

            {/* Bible Pocket (annotations drawer) */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPocketOpen(true)}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              title="Bible Pocket"
            >
              <PanelRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Reading Area ── */}
      <div ref={readingAreaRef} className={`relative py-8 sm:py-12 ${
        studyMode && studyModeVariant === "margin"
          ? "w-full px-0"
          : "mx-auto max-w-3xl px-5 sm:px-8"
      }`}>
        {currentBook && currentChapter && (
          <motion.header
            {...fadeIn}
            className={`mb-8 text-center ${studyMode ? 'pointer-events-none backdrop-blur-md bg-background/80 dark:bg-background/70 -mx-5 sm:-mx-8 px-5 sm:px-8 py-4 rounded-b-2xl sticky top-[88px] z-20' : ''}`}
            onContextMenu={(e) => {
              if (studyMode) {
                e.preventDefault();
                setThumbnailStripOpen(true);
              }
            }}
          >
            <div className="flex items-center justify-center gap-3">
              {tapNavMode && (
                <button
                  disabled={!canPrev}
                  onClick={() => setChapterIdx((i) => i - 1)}
                  className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                  aria-label="Previous chapter"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                {currentBook.title} {currentChapter.title}
              </h1>
              {tapNavMode && (
                <button
                  disabled={!canNext}
                  onClick={() => setChapterIdx((i) => i + 1)}
                  className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                  aria-label="Next chapter"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {versions?.find((v) => v.id === versionId)?.localized_title}
            </p>
            {studyMode && (
              <button
                onClick={() => setThumbnailStripOpen(true)}
                className="pointer-events-auto mt-1.5 text-[0.6rem] text-primary/60 hover:text-primary transition-colors"
              >
                ▼ Browse chapters
              </button>
            )}
          </motion.header>
        )}

        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div key="skeleton" {...fadeIn}>
              <ReadingSkeleton />
            </motion.div>
          ) : hasVerses ? (
            studyMode && studyModeVariant === "margin" ? (
            <div
              key={`${versionId}-${bookUsfm}-${chapterIdx}-${mode}`}
              style={{ fontSize: `${textSize}px` }}
              className={`bible-reading-canvas font-body ${premiumDark ? 'bible-serif-reading' : ''}`}
            >
              <PaperCanvas
                zoom={inkZoom}
                onZoomChange={handleInkZoomChange}
                baseFontSize={textSize}
                textSpacing={inkTextSpacing}
                textAlign={wsTextAlign}
                marginWidth={wsMarginWidth}
                canvasBackground={wsCanvasBackground}
                overlay={
                  <InkOverlay
                    zoom={inkZoom}
                    strokes={inkHistory.strokes}
                    onStrokeComplete={handleInkStrokeComplete}
                    onUndo={handleInkUndo}
                    penColor={inkPenColor}
                    penSize={inkPenSize}
                    penGlow={inkPenGlow}
                    fingerDrawing={inkFingerDrawing}
                    isDark={premiumDark || document.documentElement.classList.contains("dark")}
                    onCircleSelect={(verseNumbers, hullCenter) => {
                      if (verseNumbers.length > 0 && versionId && bookUsfm && currentChapter && currentBook) {
                        if (verseNumbers.length === 1 && hullCenter) {
                          const range = document.caretRangeFromPoint?.(hullCenter.x, hullCenter.y);
                          if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
                            const text = range.startContainer.textContent ?? "";
                            const offset = range.startOffset;
                            let start = offset;
                            let end = offset;
                            while (start > 0 && /\w/.test(text[start - 1])) start--;
                            while (end < text.length && /\w/.test(text[end])) end++;
                            const word = text.slice(start, end).trim();
                            if (word && word.length >= 2 && word.length < 40) {
                              setReferenceBloom({
                                x: hullCenter.x,
                                y: hullCenter.y,
                                word,
                                verseNumber: verseNumbers[0],
                              });
                              return;
                            }
                          }
                        }
                        setCrossSelections((prev) => {
                          const existing = new Set(prev.map((s) => `${s.bookUsfm}.${s.chapterNumber}.${s.verseNumber}`));
                          const newSelections = verseNumbers
                            .filter((v) => !existing.has(`${bookUsfm}.${currentChapter.id}.${v}`))
                            .map((v) => ({
                              versionId,
                              bookUsfm,
                              bookTitle: currentBook.title,
                              chapterNumber: currentChapter.id,
                              verseNumber: v,
                            }));
                          return [...prev, ...newSelections];
                        });
                        toast.success(`✨ Selected ${verseNumbers.length} verse${verseNumbers.length > 1 ? "s" : ""} by circle gesture`);
                      }
                    }}
                    onPencilFirstContact={() => {
                      const onboarded = localStorage.getItem("pencil-onboarded");
                      if (!onboarded) {
                        setPocketOpen(true);
                        localStorage.setItem("pencil-onboarded", "true");
                      }
                    }}
                    onWordCircle={(words, verseNum, anchor) => {
                      const verseData = verses.find((v) => v.number === verseNum);
                      if (verseData) {
                        setReferenceBloom({
                          x: anchor.x,
                          y: anchor.y,
                          word: words,
                          verseNumber: verseNum,
                        });
                      }
                    }}
                    onUnderlineGesture={(verseNumber, underlinedText) => {
                      if (!user) {
                        toast("Please sign in to highlight verses", {
                          description: "Create a free account to save highlights and annotations",
                        });
                        return;
                      }
                      const lastColor = (() => {
                        try { return localStorage.getItem("bible_last_highlight_color") || "yellow"; } catch { return "yellow"; }
                      })();
                      const verseData = verses.find((v) => v.number === verseNumber);
                      if (verseData) {
                        const normalizedVerse = verseData.text.replace(/\s+/g, ' ');
                        const normalizedUnderline = underlinedText.replace(/\s+/g, ' ').trim();
                        const textStart = normalizedVerse.indexOf(normalizedUnderline);
                        if (textStart >= 0) {
                          mutations.addHighlight.mutate({
                            verseNumber,
                            color: lastColor,
                            start: textStart,
                            end: textStart + normalizedUnderline.length,
                          });
                          toast.success(`Highlighted: "${normalizedUnderline.slice(0, 30)}${normalizedUnderline.length > 30 ? "…" : ""}"`);
                        } else {
                          mutations.addHighlight.mutate({
                            verseNumber,
                            color: lastColor,
                          });
                          toast.success(`Highlighted verse ${verseNumber}`);
                        }
                      }
                    }}
                    onXGesture={handleXGesture}
                  />
                }
              >
                <section className={mode === "paragraph" ? "leading-[1.9] text-foreground" : "space-y-3"}>
                  {verses.map((v) => {
                    const vNotes = noteMap.get(v.number) ?? [];
                    return (
                      <React.Fragment key={v.number}>
                        <EnrichedVerse
                          verse={v}
                          highlights={highlightMap.get(v.number) ?? []}
                          notes={vNotes}
                          bookmark={bookmarkMap.get(v.number)}
                          bunchItems={bunchMap.get(v.number) ?? []}
                          bunchColorMap={bunchColorMap}
                          bunchGroupPosition={bunchPositions.get(v.number) ?? null}
                          mode={mode}
                          isSelected={selectedVerses.has(v.number)}
                          hideBunches={hideBunchRefs}
                          onTapSelect={handleTapSelect}
                          studyMode={studyMode && studyModeVariant === "margin"}
                          verseAnnotation={annotationMap.get(v.number) ?? null}
                          onAnnotationSave={handleAnnotationSave}
                          verseIdString={bookUsfm && currentChapter ? `${bookUsfm}.${currentChapter.id}.${v.number}` : undefined}
                          highlightStyle={highlightStyle}
                          previewRange={partialSelection?.verseNumber === v.number ? { start: partialSelection.start, end: partialSelection.end } : undefined}
                          onLongPressVerseNumber={user ? handleCrossRef : undefined}
                        />
                        <AnimatePresence>
                          {noteInputVerse === v.number && (
                            <NoteInputPanel
                              verseNumber={v.number}
                              existingContent={vNotes[0]?.note_content}
                              existingId={vNotes[0]?.id}
                              onSave={handleSaveNote}
                              onCancel={() => setNoteInputVerse(null)}
                            />
                          )}
                        </AnimatePresence>
                    </React.Fragment>
                  );
                  })}
                </section>

              </PaperCanvas>
            </div>
            ) : (
            <motion.div
              key={`${versionId}-${bookUsfm}-${chapterIdx}-${mode}`}
              {...fadeIn}
              drag={tapNavMode ? false : "x"}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.15}
              onDragEnd={(_e, info) => {
                if (Math.abs(info.offset.x) > 100) {
                  if (info.offset.x < -100 && canNext) {
                    setChapterIdx((i) => i + 1);
                  } else if (info.offset.x > 100 && canPrev) {
                    setChapterIdx((i) => i - 1);
                  }
                }
              }}
              style={{ fontSize: `${textSize}px` }}
              className={`bible-reading-canvas font-body ${premiumDark ? 'bible-serif-reading' : ''}`}
            >
              <ZoomWrapper
                zoom={1}
                textSpacing={1.6}
                className="relative"
                textAlign="left"
                marginWidth={0}
                canvasBackground="none"
                studyMode={false}
              >
                <section className={mode === "paragraph" ? "leading-[1.9] text-foreground" : "space-y-3"}>
                  {verses.map((v) => {
                    const vNotes = noteMap.get(v.number) ?? [];
                    return (
                      <React.Fragment key={v.number}>
                        <EnrichedVerse
                          verse={v}
                          highlights={highlightMap.get(v.number) ?? []}
                          notes={vNotes}
                          bookmark={bookmarkMap.get(v.number)}
                          bunchItems={bunchMap.get(v.number) ?? []}
                          bunchColorMap={bunchColorMap}
                          bunchGroupPosition={bunchPositions.get(v.number) ?? null}
                          mode={mode}
                          isSelected={selectedVerses.has(v.number)}
                          hideBunches={hideBunchRefs}
                          onTapSelect={handleTapSelect}
                          studyMode={false}
                          verseAnnotation={annotationMap.get(v.number) ?? null}
                          onAnnotationSave={handleAnnotationSave}
                          verseIdString={bookUsfm && currentChapter ? `${bookUsfm}.${currentChapter.id}.${v.number}` : undefined}
                          highlightStyle={highlightStyle}
                          previewRange={partialSelection?.verseNumber === v.number ? { start: partialSelection.start, end: partialSelection.end } : undefined}
                          onLongPressVerseNumber={user ? handleCrossRef : undefined}
                        />
                        <AnimatePresence>
                          {noteInputVerse === v.number && (
                            <NoteInputPanel
                              verseNumber={v.number}
                              existingContent={vNotes[0]?.note_content}
                              existingId={vNotes[0]?.id}
                              onSave={handleSaveNote}
                              onCancel={() => setNoteInputVerse(null)}
                            />
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    );
                  })}
                </section>
              </ZoomWrapper>
            </motion.div>
            )
          ) : !versionId ? (
            <motion.div {...fadeIn} className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <BookOpen className="mb-4 h-12 w-12 opacity-40" />
              <p className="text-lg font-medium">Select a Bible version to begin reading</p>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {currentBook && totalChapters > 0 && (
          <nav className="mt-12 flex items-center justify-between border-t border-border pt-6">
            <Button
              variant="ghost"
              size="sm"
              disabled={!canPrev}
              onClick={() => setChapterIdx((i) => i - 1)}
              className="gap-1 text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              {chapterIdx + 1} of {totalChapters}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={!canNext}
              onClick={() => setChapterIdx((i) => i + 1)}
              className="gap-1 text-muted-foreground hover:text-foreground"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </nav>
        )}
      </div>

      {/* ── Floating Interaction Toolbar ── */}
      <AnimatePresence>
        {toolbarPos && selectedVerses.size > 0 && (
          <FloatingToolbar
            position={toolbarPos}
            selectedVerses={selectedArr}
            isPartialSelection={!!partialSelection}
            partialSelectionVerse={partialSelection?.verseNumber}
            partialSelectionRange={partialSelection ? { start: partialSelection.start, end: partialSelection.end } : undefined}
            isBookmarked={!!primaryBookmark}
            bookmarkId={primaryBookmark?.id}
            existingBookmarkColor={primaryBookmark?.color}
            usedBookmarkColors={usedBookmarkColors}
            existingHighlightColor={existingHighlightColor}
            existingHighlightId={existingHighlightId}
            onHighlight={handleHighlight}
            onRemoveHighlight={handleRemoveHighlight}
            onToggleBookmark={handleToggleBookmark}
            onAddNote={handleAddNote}
            onCreateBunch={handleCreateBunchRequest}
            onAddToBunch={handleAddToBunchRequest}
            hasBunches={(bunches ?? []).length > 0}
            onCrossRef={handleCrossRef}
            onReference={handleReference}
            onDismiss={dismissToolbar}
            isAuthenticated={!!user}
          />
        )}
      </AnimatePresence>

      {/* ── Cross-Reference Popover ── */}
      {crossRefVerse && versionId && bookUsfm && currentChapter && (
        <CrossReferencePopover
          bookUsfm={bookUsfm}
          chapterNumber={currentChapter.id}
          verseNumber={crossRefVerse}
          versionId={versionId}
          verseText={verses.find((v) => v.number === crossRefVerse)?.text ?? ""}
          onNavigate={(navBookUsfm, chapter, verse) => {
            handleSearchNavigate(navBookUsfm, chapter, verse);
            setCrossRefOpen(false);
            setCrossRefVerse(null);
          }}
          open={crossRefOpen}
          onOpenChange={(open) => {
            setCrossRefOpen(open);
            if (!open) setCrossRefVerse(null);
          }}
        />
      )}

      {/* ── Reference Bloom ── */}
      <AnimatePresence>
        {referenceBloom && versionId && bookUsfm && currentChapter && (
          <ReferenceBloom
            anchorPoint={{ x: referenceBloom.x, y: referenceBloom.y }}
            word={referenceBloom.word}
            verseNumber={referenceBloom.verseNumber}
            bookUsfm={bookUsfm}
            chapter={currentChapter.id}
            versionId={versionId}
            verseText={verses.find((v) => v.number === referenceBloom.verseNumber)?.text ?? ""}
            onClose={() => setReferenceBloom(null)}
            onNavigate={(navBookUsfm, chapter, verse) => {
              handleSearchNavigate(navBookUsfm, chapter, verse);
              setReferenceBloom(null);
            }}
            onPinToMargin={() => {
              if (bookUsfm && currentChapter) {
                const verseIdStr = `${bookUsfm}.${currentChapter.id}.${referenceBloom.verseNumber}`;
                saveAnnotationMut.mutate({
                  verseIds: [verseIdStr],
                  strokes: [],
                  typedText: `[word-study] ${referenceBloom.word}`,
                  existingId: undefined,
                });
                toast.success("📌 Pinned to margin");
              }
              setReferenceBloom(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Verse Bunch Tooltip ── */}
      <AnimatePresence>
        {showBunchDialog && currentBook && currentChapter && versionId && bookUsfm && (
          <VerseBunchTooltip
            selectedVerses={crossSelections.map((s) => s.verseNumber)}
            bookTitle={currentBook.title}
            chapterTitle={currentChapter.title}
            versionId={versionId}
            bookUsfm={bookUsfm}
            chapterNumber={currentChapter.id}
            isAuthenticated={!!user}
            onConfirm={handleBunchConfirm}
            onAddToExisting={handleAddToExistingBunch}
            existingBunches={bunches ?? []}
            onDismiss={handleBunchDismiss}
            initialStep={bunchAwareState ? "form" : "awareness"}
          />
        )}
      </AnimatePresence>

      {/* ── Multi-select instruction tooltip ── */}
      <AnimatePresence>
        {showMultiSelectTip && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-border bg-card px-4 py-3 shadow-xl max-w-sm"
          >
            <p className="text-xs text-muted-foreground leading-relaxed text-center">
              <strong className="text-foreground">Tip:</strong> Hold{" "}
              <kbd className="inline-flex items-center rounded border border-border bg-muted px-1.5 py-0.5 text-[0.65rem] font-mono font-medium text-foreground">
                {navigator.platform?.includes("Mac") ? "⌘ Cmd" : "Ctrl"}
              </kbd>{" "}
              and click to select multiple verses, or hold{" "}
              <kbd className="inline-flex items-center rounded border border-border bg-muted px-1.5 py-0.5 text-[0.65rem] font-mono font-medium text-foreground">
                Shift
              </kbd>{" "}
              to select a range.
            </p>
            <button
              onClick={() => {
                setShowMultiSelectTip(false);
                try { localStorage.setItem("bible_multiselect_tip", "true"); } catch {}
              }}
              className="mt-2 w-full text-center text-[0.65rem] font-medium text-primary hover:underline"
            >
              Got it
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bible Sleeve Sheet ── */}
      <BibleSleeveSheet
        open={sleeveOpen}
        onOpenChange={setSleeveOpen}
        userName={user?.user_metadata?.full_name || user?.email || undefined}
        textSize={textSize}
        minSize={MIN_SIZE}
        maxSize={MAX_SIZE}
        onTextSizeChange={setTextSize}
        readingMode={mode}
        onReadingModeChange={setMode}
        crossTranslation={crossTranslation}
        onToggleCrossTranslation={toggleCrossTranslation}
        hideBunches={hideBunchRefs}
        onToggleHideBunches={toggleHideBunches}
        crossBunchTranslation={crossBunchTranslation}
        onToggleCrossBunchTranslation={toggleCrossBunchTranslation}
        premiumDark={premiumDark}
        oledMode={oledMode}
        onTogglePremiumDark={handleTogglePremiumDark}
        onToggleOled={handleToggleOled}
        easeEyesDim={easeEyesDim}
        onEaseEyesDimChange={handleEaseEyesDimChange}
        easeEyesTint={easeEyesTint}
        onEaseEyesTintChange={handleEaseEyesTintChange}
        highlights={chapterData?.highlights ?? []}
        bookmarks={chapterData?.bookmarks ?? []}
        notes={chapterData?.notes ?? []}
        currentBook={currentBook?.title}
        currentChapter={currentChapter?.title}
        bunches={bunches ?? []}
        onNavigateToBunch={(b) => { setSleeveOpen(false); handleNavigateToBunch(b); }}
        onSetActiveBunch={handleSetActiveBunch}
        onDeleteBunch={handleDeleteBunch}
        onNavigateToVerse={(vn) => {
          setSleeveOpen(false);
          pendingScrollVerseRef.current = vn;
        }}
        immersiveSupported={immersiveSupported}
        immersiveStandalone={immersiveStandalone}
        immersiveIOSLimited={immersiveIOSLimited}
        immersiveActive={immersiveActive}
        onToggleImmersive={toggleImmersive}
        studyMode={studyMode}
        studyModeVariant={studyModeVariant}
        pencilDetected={pencilDetected}
        onToggleStudyMode={isIPad ? handleToggleStudyMode : undefined}
        onStudyModeVariantChange={isIPad ? handleStudyModeVariantChange : undefined}
        isIPad={isIPad}
        isIPhone={isIPhone}
        tapNavMode={tapNavMode}
        onToggleTapNav={handleToggleTapNav}
        highlightStyle={highlightStyle}
        onHighlightStyleChange={handleHighlightStyleChange}
        studyArtifacts={studyArtifacts}
        onNavigateToArtifact={(artifact: any) => {
          setSleeveOpen(false);
          setBookUsfm(artifact.book_usfm);
          setChapterIdx(artifact.chapter_number - 1);
        }}
      />

      {/* ── Manuscript Canvas (Mode 2) ── */}
      {canvasOpen && studyMode && studyModeVariant === "canvas" && (
        <ManuscriptCanvas
          chapterTitle={currentBook && currentChapter ? `${currentBook.title} ${currentChapter.title}` : undefined}
          verses={verses.map((v) => ({ number: v.number, text: v.text }))}
          initialStrokes={canvasInitialStrokes}
          onSave={handleCanvasSave}
          onClose={() => setCanvasOpen(false)}
          textSize={textSize}
        />
      )}

      {/* ── Journal Panel (Mode 3) ── */}
      <JournalPanel
        open={journalOpen && studyMode && studyModeVariant === "journal"}
        onOpenChange={setJournalOpen}
        chapterTitle={currentBook && currentChapter ? `${currentBook.title} ${currentChapter.title}` : undefined}
        bookUsfm={bookUsfm}
        chapterId={currentChapter?.id}
        journalAnnotations={journalAnnotations ?? []}
        onSave={handleJournalSave}
        onDelete={(id) => deleteAnnotationMut.mutate(id)}
      />

      {immersiveActive && <ImmersiveExitPill onExit={() => toggleImmersive(false)} />}

      {/* ── Ink Toolbar (Mode 1: Marginalia) — hardware-gated ── */}
      {studyMode && studyModeVariant === "margin" && isIPhone && (
        <MobileStudyToolbar
          penColor={inkPenColor}
          onPenColorChange={setInkPenColor}
          penSize={inkPenSize}
          onPenSizeChange={setInkPenSize}
          penGlow={inkPenGlow}
          onPenGlowChange={handleInkPenGlowChange}
          zoom={inkZoom}
          onZoomChange={handleInkZoomChange}
          textSpacing={inkTextSpacing}
          onTextSpacingChange={handleInkTextSpacingChange}
          onUndo={handleInkUndo}
          onRedo={handleInkRedo}
          onClear={handleInkClearRequest}
          canUndo={inkHistory.canUndo}
          canRedo={inkHistory.canRedo}
          fingerDrawing={inkFingerDrawing}
          onFingerDrawingChange={setInkFingerDrawing}
          isDark={premiumDark || document.documentElement.classList.contains("dark")}
          onOpenTrash={() => setInkTrashOpen(true)}
          onOpenVoice={() => setVoiceOverlayActive(true)}
          hasTrashItems={inkHistory.trashBin.length > 0}
          textAlign={wsTextAlign}
          onTextAlignChange={handleWsTextAlign}
          marginWidth={wsMarginWidth}
          onMarginWidthChange={handleWsMarginWidth}
          canvasBackground={wsCanvasBackground}
          onCanvasBackgroundChange={handleWsCanvasBackground}
        />
      )}
      {studyMode && studyModeVariant === "margin" && isIPad && (
        <IPadStudyToolbar
          penColor={inkPenColor}
          onPenColorChange={setInkPenColor}
          penSize={inkPenSize}
          onPenSizeChange={setInkPenSize}
          penGlow={inkPenGlow}
          onPenGlowChange={handleInkPenGlowChange}
          zoom={inkZoom}
          onZoomChange={handleInkZoomChange}
          textSpacing={inkTextSpacing}
          onTextSpacingChange={handleInkTextSpacingChange}
          onUndo={handleInkUndo}
          onRedo={handleInkRedo}
          onClear={handleInkClearRequest}
          canUndo={inkHistory.canUndo}
          canRedo={inkHistory.canRedo}
          fingerDrawing={inkFingerDrawing}
          onFingerDrawingChange={setInkFingerDrawing}
          isDark={premiumDark || document.documentElement.classList.contains("dark")}
          onOpenTrash={() => setInkTrashOpen(true)}
          onOpenVoice={() => setVoiceOverlayActive(true)}
          hasTrashItems={inkHistory.trashBin.length > 0}
          textAlign={wsTextAlign}
          onTextAlignChange={handleWsTextAlign}
          marginWidth={wsMarginWidth}
          onMarginWidthChange={handleWsMarginWidth}
          canvasBackground={wsCanvasBackground}
          onCanvasBackgroundChange={handleWsCanvasBackground}
          hideSpacing={studyModeVariant === "margin"}
        />
      )}

      {/* ── Canvas Setup Sheet ── */}
      <CanvasSetupSheet
        open={canvasSetupOpen}
        onOpenChange={setCanvasSetupOpen}
        bookTitle={currentBook?.title ?? ""}
        chapterTitle={currentChapter?.id ?? ""}
        versionAbbr={versions?.find((v) => v.id === versionId)?.localized_abbreviation ?? ""}
        previewVerses={verses.slice(0, 3)}
        onConfirm={(spacing) => {
          setInkTextSpacing(spacing);
          try { localStorage.setItem("bible_ink_spacing", String(spacing)); } catch {}
          setStudyMode(true);
          try { localStorage.setItem("bible_study_mode", "true"); } catch {}
          setCanvasSetupOpen(false);
        }}
      />

      {/* ── Eraser Confirmation Dialog ── */}
      <AlertDialog open={eraserConfirmOpen} onOpenChange={setEraserConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all ink?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear all strokes on this page. You can restore them from the trash bin or undo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleInkClearConfirm}>Clear Board</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Ink Trash Bin Sheet ── */}
      <InkTrashSheet
        open={inkTrashOpen}
        onClose={() => setInkTrashOpen(false)}
        trashBin={inkHistory.trashBin}
        onRestore={(id) => {
          inkHistory.restoreFromTrash(id);
          setInkTrashOpen(false);
          toast.success("Ink restored ✨");
        }}
      />

      {/* ── Voice Annotation Overlay ── */}
      <VoiceAnnotationOverlay
        active={voiceOverlayActive}
        onClose={() => setVoiceOverlayActive(false)}
        onTranscriptComplete={handleVoiceTranscript}
      />

      {/* ── Bible Pocket Sheet ── */}
      <BiblePocketSheet
        open={pocketOpen}
        onOpenChange={setPocketOpen}
        chapterTitle={currentBook && currentChapter ? `${currentBook.title} ${currentChapter.title}` : undefined}
        chapterAnnotations={chapterAnnotations ?? []}
        inkStrokes={inkHistory.strokes}
        journalAnnotations={journalAnnotations ?? []}
        onExportCanvas={() => { setPocketOpen(false); setExportSheetOpen(true); }}
        onTryAction={(actionId) => {
          setPocketOpen(false);
          switch (actionId) {
            case "openVoice":
              setVoiceOverlayActive(true);
              break;
            case "openTrash":
              setInkTrashOpen(true);
              break;
            case "openThumbnails":
              setThumbnailStripOpen(true);
              break;
          }
        }}
      />

      {/* ── Canvas Export Sheet ── */}
      <CanvasExportSheet
        open={exportSheetOpen}
        onOpenChange={setExportSheetOpen}
        readingAreaRef={readingAreaRef}
        bookUsfm={bookUsfm}
        chapterNumber={chapterIdx + 1}
        chapterTitle={currentBook && currentChapter ? `${currentBook.title} ${currentChapter.title}` : "Chapter"}
        versionId={versionId}
      />

      {/* ── Chapter Thumbnail Strip ── */}
      <ChapterThumbnailStrip
        open={thumbnailStripOpen}
        onClose={() => setThumbnailStripOpen(false)}
        currentChapterIdx={chapterIdx}
        totalChapters={totalChapters}
        bookTitle={currentBook?.title}
        chapterTitles={currentBook?.chapters?.map((ch) => ch.title) ?? []}
        onNavigate={(idx) => setChapterIdx(idx)}
      />

      {/* ── Add to Bunch Drawer ── */}
      <AddToBunchDrawer
        open={addToBunchOpen}
        onOpenChange={setAddToBunchOpen}
        bunches={bunches ?? []}
        onSelect={handleAddToBunchConfirm}
      />

      {/* ── Verse Added Toast ── */}
      <VerseAddedToast bunchName={verseAddedToast.name} visible={verseAddedToast.visible} />

      {/* ── Bible Search ── */}
      <BibleSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        availableBooks={index?.books?.map((b) => b.id)}
        onNavigate={handleSearchNavigate}
      />

      {/* ── iPad Waitlist Drawer ── */}
      <IPadWaitlistDrawer open={waitlistDrawerOpen} onOpenChange={setWaitlistDrawerOpen} />
      <BibleSuggestionSheet open={suggestionDrawerOpen} onClose={() => setSuggestionDrawerOpen(false)} />
    </article>
  );
}

export default BibleReader;
