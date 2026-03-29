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
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
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
import { useBibleMutations, type ScriptureRef } from "@/hooks/useBibleMutations";
import { useAuth } from "@/contexts/AuthContext";
import {
  FloatingToolbar,
  NoteInputPanel,
  type ToolbarPosition,
} from "@/components/bible/FloatingToolbar";
import {
  VerseBunchTooltip,
  isBunchAware,
  loadPendingBunch,
  clearPendingBunch,
} from "@/components/bible/VerseBunchDialog";
import { VerseBunchStrip, type BunchWithCount } from "@/components/bible/VerseBunchStrip";

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

/* ── Bunch indicator ── */
function BunchIndicator({ bunchItems }: { bunchItems: VerseBunchItemWithName[] }) {
  if (!bunchItems.length) return null;
  const names = [...new Set(bunchItems.map((b) => b.bunch_name))];
  return (
    <span className="inline-flex items-center ml-1 align-middle" title={`In: ${names.join(", ")}`}>
      <span className="inline-flex h-5 items-center gap-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 px-1.5 text-[0.6rem] font-medium text-violet-700 dark:text-violet-300">
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
  bunchGroupPosition: "first" | "middle" | "last" | "single" | null;
  mode: ReadingMode;
  isSelected: boolean;
  onTapSelect: (verseNumber: number, e: React.MouseEvent) => void;
}

function EnrichedVerse({
  verse,
  highlights,
  notes,
  isBookmarked,
  bunchItems,
  bunchGroupPosition,
  mode,
  isSelected,
  onTapSelect,
}: EnrichedVerseProps) {
  const bunchBorderClass = useMemo(() => {
    if (!bunchGroupPosition) return "";
    const base = "border-l-2 border-violet-300 dark:border-violet-600 pl-3";
    switch (bunchGroupPosition) {
      case "first": return `${base} rounded-tl-md pt-2`;
      case "last": return `${base} rounded-bl-md pb-2`;
      case "middle": return base;
      case "single": return `${base} rounded-l-md py-1`;
      default: return "";
    }
  }, [bunchGroupPosition]);

  const selectedClass = isSelected
    ? "bg-primary/10 dark:bg-primary/15 ring-1 ring-primary/30 rounded-md"
    : "";

  if (mode === "paragraph") {
    return (
      <span
        id={`verse-${verse.number}`}
        data-verse={verse.number}
        className={`${bunchGroupPosition ? "bg-violet-50/40 dark:bg-violet-950/20" : ""} ${selectedClass} cursor-pointer`}
        onClick={(e) => onTapSelect(verse.number, e)}
      >
        <sup className="mx-0.5 text-[0.65rem] font-semibold text-primary/60 select-none align-super">
          <BookmarkRibbon isBookmarked={isBookmarked} />
          {verse.number}
        </sup>
        <HighlightedText text={verse.text} highlights={highlights} />
        <NoteMarginalia notes={notes} />
        <BunchIndicator bunchItems={bunchItems} />{" "}
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
        <BunchIndicator bunchItems={bunchItems} />
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

/* ═══════════════════════════════════════════════════
   MAIN BIBLE READER
   ═══════════════════════════════════════════════════ */
export function BibleReader() {
  const { user } = useAuth();
  const [versionId, setVersionId] = useState<number | undefined>(undefined);
  const [bookUsfm, setBookUsfm] = useState<string | undefined>(undefined);
  const [chapterIdx, setChapterIdx] = useState<number>(0);
  const [mode, setMode] = useState<ReadingMode>("verse");

  // ── Selection state ──
  const [selectedVerses, setSelectedVerses] = useState<Set<number>>(new Set());
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
  const [bunchAware, setBunchAwareState] = useState(isBunchAware);

  const readingAreaRef = useRef<HTMLDivElement>(null);

  // Data hooks
  const { data: versions, isLoading: versionsLoading } = useBibleVersions();
  const { data: index, isLoading: indexLoading } = useBibleIndex(versionId);

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

  // Navigation
  const totalChapters = currentBook?.chapters?.length ?? 0;
  const canPrev = chapterIdx > 0;
  const canNext = chapterIdx < totalChapters - 1;

  // Auto-select BSB & first book
  useEffect(() => {
    if (versions?.length && !versionId) {
      const bsb = versions.find((v) => v.abbreviation === "BSB" || v.localized_abbreviation === "BSB");
      setVersionId(bsb ? bsb.id : versions[0].id);
    }
  }, [versions, versionId]);

  useEffect(() => {
    if (index?.books?.length && !bookUsfm) {
      setBookUsfm(index.books[0].id);
      setChapterIdx(0);
    }
  }, [index, bookUsfm]);

  // Clear selection on chapter change
  useEffect(() => {
    setSelectedVerses(new Set());
    setToolbarPos(null);
    setPartialSelection(null);
    setNoteInputVerse(null);
    setShowBunchDialog(false);
  }, [versionId, bookUsfm, chapterIdx]);

  // ── Dismiss toolbar ──
  const dismissToolbar = useCallback(() => {
    setToolbarPos(null);
    setPartialSelection(null);
    setSelectedVerses(new Set());
    window.getSelection()?.removeAllRanges();
  }, []);

  // ── Tap-select handler ──
  const handleTapSelect = useCallback(
    (verseNumber: number, e: React.MouseEvent) => {
      // Don't interfere with note/toolbar button clicks
      if ((e.target as HTMLElement).closest("button, a, input, textarea")) return;

      // Check for text selection first
      const sel = window.getSelection();
      if (sel && sel.toString().trim().length > 0) {
        // This is a partial text selection — handle in mouseup
        return;
      }

      // Multi-select with Ctrl/Meta or Shift
      if (e.ctrlKey || e.metaKey) {
        setSelectedVerses((prev) => {
          const next = new Set(prev);
          if (next.has(verseNumber)) next.delete(verseNumber);
          else next.add(verseNumber);
          return next;
        });
      } else if (e.shiftKey && selectedVerses.size > 0) {
        // Range select
        const sorted = [...selectedVerses].sort((a, b) => a - b);
        const anchor = sorted[0];
        const start = Math.min(anchor, verseNumber);
        const end = Math.max(anchor, verseNumber);
        const range = new Set<number>();
        for (let i = start; i <= end; i++) range.add(i);
        setSelectedVerses(range);
      } else {
        // Single tap toggle
        setSelectedVerses((prev) => {
          if (prev.has(verseNumber) && prev.size === 1) return new Set();
          return new Set([verseNumber]);
        });
      }

      // Position toolbar near click
      setToolbarPos({
        x: Math.min(e.clientX, window.innerWidth - 200),
        y: Math.max(e.clientY - 60, 10),
      });
      setPartialSelection(null);
    },
    [selectedVerses],
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
        // Single-verse partial selection
        const verseEl = area.querySelector(`[data-verse="${startVerse}"]`);
        const textContent = verseEl?.textContent ?? "";
        // Approximate character offsets
        const selectedText = sel.toString();
        const textStart = textContent.indexOf(selectedText);
        setPartialSelection({
          verseNumber: startVerse,
          start: Math.max(textStart, 0),
          end: Math.max(textStart, 0) + selectedText.length,
        });
        setSelectedVerses(new Set([startVerse]));
      } else if (endVerse !== null) {
        // Multi-verse selection
        const start = Math.min(startVerse, endVerse);
        const end = Math.max(startVerse, endVerse);
        const range = new Set<number>();
        for (let i = start; i <= end; i++) range.add(i);
        setSelectedVerses(range);
        setPartialSelection(null);
      }

      setToolbarPos(pos);
    };

    area.addEventListener("mouseup", handleMouseUp);
    return () => area.removeEventListener("mouseup", handleMouseUp);
  }, []);

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

  const handleCreateBunchRequest = useCallback(() => {
    if (selectedVerses.size < 2) return;
    if (!bunchDialogDismissed) {
      setShowBunchDialog(true);
    } else {
      // If dismissed, go straight to form (skip prompt)
      setShowBunchDialog(true);
    }
  }, [selectedVerses, bunchDialogDismissed]);

  const handleBunchConfirm = useCallback(
    (bunchName: string, description?: string) => {
      mutations.createBunch.mutate({
        bunchName,
        verseNumbers: [...selectedVerses].sort((a, b) => a - b),
        description,
      });
      setShowBunchDialog(false);
      dismissToolbar();
    },
    [selectedVerses, mutations.createBunch, dismissToolbar],
  );

  // ── Determine toolbar context ──
  const selectedArr = useMemo(() => [...selectedVerses].sort((a, b) => a - b), [selectedVerses]);
  const primaryVerse = selectedArr[0];
  const primaryBookmark = primaryVerse ? bookmarkMap.get(primaryVerse) : undefined;

  return (
    <article className="min-h-screen bg-background">
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
              {versions?.map((v) => (
                <SelectItem key={v.id} value={v.id.toString()}>
                  {v.localized_abbreviation}
                </SelectItem>
              ))}
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
          {selectedVerses.size > 0 && (
            <span className="text-xs text-muted-foreground">
              {selectedVerses.size} verse{selectedVerses.size > 1 ? "s" : ""} selected
            </span>
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
              className="font-body text-base sm:text-lg"
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
                        bunchGroupPosition={bunchPositions.get(v.number) ?? null}
                        mode={mode}
                        isSelected={selectedVerses.has(v.number)}
                        onTapSelect={handleTapSelect}
                      />
                      {/* Inline note input */}
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
            onHighlight={handleHighlight}
            onToggleBookmark={handleToggleBookmark}
            onAddNote={handleAddNote}
            onCreateBunch={handleCreateBunchRequest}
            onDismiss={dismissToolbar}
            isAuthenticated={!!user}
          />
        )}
      </AnimatePresence>

      {/* ── Verse Bunch Dialog ── */}
      <AnimatePresence>
        {showBunchDialog && currentBook && currentChapter && (
          <VerseBunchDialog
            selectedVerses={selectedArr}
            bookTitle={currentBook.title}
            chapterTitle={currentChapter.title}
            onConfirm={handleBunchConfirm}
            onDismiss={() => setShowBunchDialog(false)}
            onDontShowAgain={() => {
              setBunchDialogDismissed(true);
              setShowBunchDialog(false);
            }}
          />
        )}
      </AnimatePresence>
    </article>
  );
}

export default BibleReader;
