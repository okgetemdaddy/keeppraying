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
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Toggle } from "@/components/ui/toggle";
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
import { useAuth } from "@/contexts/AuthContext";
import { useCrossTranslationAnnotations } from "@/hooks/useCrossTranslationAnnotations";
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
import { SelectedVersesStrip, type SelectedVerse } from "@/components/bible/SelectedVersesStrip";
import { getBunchColor, BUNCH_COLOR_CLASSES } from "@/components/bible/bunchColors";

type ReadingMode = "verse" | "paragraph";

const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.25 },
};

/* ── Highlight colour map ── */
const HIGHLIGHT_COLORS: Record<string, string> = {
  yellow: "bg-yellow-200/50 dark:bg-yellow-400/20",
  green: "bg-emerald-200/50 dark:bg-emerald-400/20",
  blue: "bg-sky-200/50 dark:bg-sky-400/20",
  pink: "bg-pink-200/50 dark:bg-pink-400/20",
  purple: "bg-violet-200/50 dark:bg-violet-400/20",
  orange: "bg-orange-200/50 dark:bg-orange-400/20",
};

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

/* ── Highlighted text renderer (supports partial-verse spans) ── */
function HighlightedText({
  text,
  highlights,
}: {
  text: string;
  highlights: UserHighlight[];
}) {
  if (!highlights.length) return <>{text}</>;

  const spans = highlights
    .map((h) => ({
      start: h.reference_normalized?.start ?? 0,
      end: h.reference_normalized?.end ?? text.length,
      color: h.color,
    }))
    .sort((a, b) => a.start - b.start);

  const parts: React.ReactNode[] = [];
  let cursor = 0;

  for (let i = 0; i < spans.length; i++) {
    const span = spans[i];
    const start = Math.max(span.start, cursor);
    const end = Math.min(span.end, text.length);

    if (start > cursor) {
      parts.push(<span key={`gap-${cursor}`}>{text.slice(cursor, start)}</span>);
    }

    if (end > start) {
      const colorClass = HIGHLIGHT_COLORS[span.color] ?? HIGHLIGHT_COLORS.yellow;
      parts.push(
        <mark key={`hl-${i}`} className={`${colorClass} rounded-sm px-0.5 transition-colors`}>
          {text.slice(start, end)}
        </mark>,
      );
    }

    cursor = end;
  }

  if (cursor < text.length) {
    parts.push(<span key={`tail-${cursor}`}>{text.slice(cursor)}</span>);
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
function BookmarkRibbon({ isBookmarked }: { isBookmarked: boolean }) {
  if (!isBookmarked) return null;
  return (
    <span className="inline-flex items-center mr-0.5 text-primary" title="Bookmarked">
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
  isBookmarked: boolean;
  bunchItems: VerseBunchItemWithName[];
  bunchColorMap: Map<string, number>;
  bunchGroupPosition: "first" | "middle" | "last" | "single" | null;
  mode: ReadingMode;
  isSelected: boolean;
  hideBunches: boolean;
  onTapSelect: (verseNumber: number, e: React.MouseEvent) => void;
}

function EnrichedVerse({
  verse,
  highlights,
  notes,
  isBookmarked,
  bunchItems,
  bunchColorMap,
  bunchGroupPosition,
  mode,
  isSelected,
  hideBunches,
  onTapSelect,
}: EnrichedVerseProps) {
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
        <sup className="mx-0.5 text-[0.65rem] font-semibold text-primary/60 select-none align-super">
          <BookmarkRibbon isBookmarked={isBookmarked} />
          {verse.number}
        </sup>
        <HighlightedText text={verse.text} highlights={highlights} />
        <NoteMarginalia notes={notes} />
        {!hideBunches && <BunchIndicator bunchItems={bunchItems} bunchColorMap={bunchColorMap} />}{" "}
      </span>
    );
  }

  return (
    <div
      id={`verse-${verse.number}`}
      data-verse={verse.number}
      className={`group relative leading-relaxed text-foreground ${bunchBorderClass} ${selectedClass} cursor-pointer px-1 -mx-1`}
      onClick={(e) => onTapSelect(verse.number, e)}
    >
      <p>
        <BookmarkRibbon isBookmarked={isBookmarked} />
        <sup className="mr-1 text-xs font-semibold text-primary/70 select-none">
          {verse.number}
        </sup>
        <HighlightedText text={verse.text} highlights={highlights} />
        <NoteMarginalia notes={notes} />
        {!hideBunches && <BunchIndicator bunchItems={bunchItems} bunchColorMap={bunchColorMap} />}
      </p>
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

/* ── localStorage helper for hide bunches ── */
function getHideBunches(): boolean {
  try { return localStorage.getItem("bible_hide_bunch_refs") === "true"; } catch { return false; }
}

/* ═══════════════════════════════════════════════════
   MAIN BIBLE READER
   ═══════════════════════════════════════════════════ */
export function BibleReader() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { size: textSize, setTextSize, MIN_SIZE, MAX_SIZE } = useBibleTextSize();
  const [versionId, setVersionId] = useState<number | undefined>(undefined);
  const [bookUsfm, setBookUsfm] = useState<string | undefined>(undefined);
  const [chapterIdx, setChapterIdx] = useState<number>(0);
  const [mode, setMode] = useState<ReadingMode>("verse");

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

  // ── Bunch dialog state ──
  const [showBunchDialog, setShowBunchDialog] = useState(false);
  const [bunchAwareState, setBunchAwareStateReact] = useState(isBunchAware);

  // ── Hide bunches toggle ──
  const [hideBunchRefs, setHideBunchRefs] = useState(getHideBunches);

  // ── Cross-translation annotations ──
  const { enabled: crossTranslation, toggle: toggleCrossTranslation } = useCrossTranslationAnnotations();

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
  );

  const verses = chapterData?.verses ?? [];
  const hasVerses = verses.length > 0;

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

  // Auto-select BSB (Berean Standard Bible) as default — NIV is not available via the API
  useEffect(() => {
    if (versions?.length && !versionId) {
      // Prefer NIV, then BSB, then first available
      const niv = versions.find((v) => v.id === 111);
      const bsb = versions.find((v) => v.abbreviation === "BSB" || v.localized_abbreviation === "BSB");
      setVersionId(niv?.id ?? bsb?.id ?? versions[0].id);
    }
  }, [versions, versionId]);

  useEffect(() => {
    if (index?.books?.length && !bookUsfm) {
      setBookUsfm(index.books[0].id);
      setChapterIdx(0);
    }
  }, [index, bookUsfm]);

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
  const handleTapSelect = useCallback(
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

  // ── Text selection handler (mouseup on reading area) ──
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
        const textStart = textContent.indexOf(selectedText);
        setPartialSelection({
          verseNumber: startVerse,
          start: Math.max(textStart, 0),
          end: Math.max(textStart, 0) + selectedText.length,
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
    return () => area.removeEventListener("mouseup", handleMouseUp);
  }, [versionId, bookUsfm, currentChapter, currentBook]);

  // ── Toolbar action handlers ──
  const handleHighlight = useCallback(
    (color: string, verseNumber: number, start?: number, end?: number) => {
      mutations.addHighlight.mutate({ verseNumber, color, start, end });
    },
    [mutations.addHighlight],
  );

  const handleToggleBookmark = useCallback(
    (verseNumber: number, existingId?: string) => {
      mutations.toggleBookmark.mutate({ verseNumber, existingId });
    },
    [mutations.toggleBookmark],
  );

  const handleAddNote = useCallback(
    (verseNumber: number) => {
      setNoteInputVerse(verseNumber);
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
        setTimeout(() => {
          document.getElementById(`verse-${bunch.first_verse}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 500);
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
      setTimeout(() => {
        document.getElementById(`verse-${v.verseNumber}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 400);
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

  // ── Determine toolbar context ──
  const selectedArr = useMemo(() => [...selectedVerses].sort((a, b) => a - b), [selectedVerses]);
  const primaryVerse = selectedArr[0];
  const primaryBookmark = primaryVerse ? bookmarkMap.get(primaryVerse) : undefined;

  // Derive existing highlight color/id for primary verse (for unhighlight X)
  const primaryHighlights = primaryVerse ? highlightMap.get(primaryVerse) ?? [] : [];
  const existingHighlightColor = primaryHighlights.length === 1 ? primaryHighlights[0].color : undefined;
  const existingHighlightId = primaryHighlights.length === 1 ? primaryHighlights[0].id : undefined;

  const handleRemoveHighlight = useCallback(
    (highlightId: string) => {
      mutations.removeHighlight.mutate(highlightId);
    },
    [mutations.removeHighlight],
  );

  return (
    <article className="min-h-screen bg-background">
      {/* ── Verse Bunch strip (saved bunches) ── */}
      {!hideBunchRefs && <VerseBunchStrip onNavigateToBunch={handleNavigateToBunch} />}

      {/* ── Selected verses strip (active selections) ── */}
      <SelectedVersesStrip
        selections={crossSelections}
        onRemove={handleRemoveSelection}
        onNavigate={handleNavigateToSelection}
        onCreateBunch={handleCreateBunchRequest}
      />

      {/* ── Toolbar ── */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2 px-4 py-3">
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
                // Insert separator after the featured translations (NIV, NIrV, BSB)
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
                className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
                title="Text size"
              >
                <AArrowUp className="h-4.5 w-4.5" />
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

          {/* Hide bunches toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleHideBunches}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            title={hideBunchRefs ? "Show Bunches" : "Hide Bunches"}
          >
            {hideBunchRefs ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </Button>

          {/* Cross-translation annotations toggle */}
          {user && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCrossTranslation}
              className={`h-7 w-7 p-0 transition-colors ${crossTranslation ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
              title={crossTranslation ? "Annotations: All translations" : "Annotations: Current translation only"}
            >
              <Globe className="h-3.5 w-3.5" />
            </Button>
          )}

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
        </div>
      </div>

      {/* ── Reading Area ── */}
      <div ref={readingAreaRef} className="mx-auto max-w-3xl px-5 sm:px-8 py-8 sm:py-12">
        {currentBook && currentChapter && (
          <motion.header {...fadeIn} className="mb-8 text-center">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              {currentBook.title} {currentChapter.title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {versions?.find((v) => v.id === versionId)?.localized_title}
            </p>
          </motion.header>
        )}

        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div key="skeleton" {...fadeIn}>
              <ReadingSkeleton />
            </motion.div>
          ) : hasVerses ? (
            <motion.div
              key={`${versionId}-${bookUsfm}-${chapterIdx}-${mode}`}
              {...fadeIn}
              style={{ fontSize: `${textSize}px` }}
              className="font-body"
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
                        isBookmarked={bookmarkMap.has(v.number)}
                        bunchItems={bunchMap.get(v.number) ?? []}
                        bunchColorMap={bunchColorMap}
                        bunchGroupPosition={bunchPositions.get(v.number) ?? null}
                        mode={mode}
                        isSelected={selectedVerses.has(v.number)}
                        hideBunches={hideBunchRefs}
                        onTapSelect={handleTapSelect}
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
            </motion.div>
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
            existingHighlightColor={existingHighlightColor}
            existingHighlightId={existingHighlightId}
            onHighlight={handleHighlight}
            onRemoveHighlight={handleRemoveHighlight}
            onToggleBookmark={handleToggleBookmark}
            onAddNote={handleAddNote}
            onCreateBunch={handleCreateBunchRequest}
            onDismiss={dismissToolbar}
            isAuthenticated={!!user}
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
    </article>
  );
}

export default BibleReader;
