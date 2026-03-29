import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  AlignJustify,
  List,
  Bookmark,
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

  // Sort highlights by start position
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

    // Unhighlighted gap before this span
    if (start > cursor) {
      parts.push(<span key={`gap-${cursor}`}>{text.slice(cursor, start)}</span>);
    }

    // Highlighted span
    if (end > start) {
      const colorClass = HIGHLIGHT_COLORS[span.color] ?? HIGHLIGHT_COLORS.yellow;
      parts.push(
        <mark
          key={`hl-${i}`}
          className={`${colorClass} rounded-sm px-0.5 transition-colors`}
        >
          {text.slice(start, end)}
        </mark>,
      );
    }

    cursor = end;
  }

  // Remaining text after last highlight
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
        onClick={() => setExpanded(!expanded)}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800/50 transition-colors"
        aria-label={`${notes.length} note${notes.length > 1 ? "s" : ""} on this verse`}
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
    <span
      className="inline-flex items-center mr-0.5 text-primary"
      title="Bookmarked"
      aria-label="Bookmarked verse"
    >
      <BookmarkCheck className="h-3.5 w-3.5" />
    </span>
  );
}

/* ── Bunch indicator ── */
function BunchIndicator({ bunchItems }: { bunchItems: VerseBunchItemWithName[] }) {
  if (!bunchItems.length) return null;

  const names = [...new Set(bunchItems.map((b) => b.bunch_name))];

  return (
    <span
      className="inline-flex items-center ml-1 align-middle"
      title={`In: ${names.join(", ")}`}
    >
      <span className="inline-flex h-5 items-center gap-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 px-1.5 text-[0.6rem] font-medium text-violet-700 dark:text-violet-300">
        <Package className="h-3 w-3" />
        {names.length === 1 ? names[0] : `${names.length} bunches`}
      </span>
    </span>
  );
}

/* ── Enriched verse container (shared by both modes) ── */
interface EnrichedVerseProps {
  verse: NormalisedVerse;
  highlights: UserHighlight[];
  notes: UserNote[];
  isBookmarked: boolean;
  bunchItems: VerseBunchItemWithName[];
  bunchGroupPosition?: "first" | "middle" | "last" | "single" | null;
  mode: ReadingMode;
}

function EnrichedVerse({
  verse,
  highlights,
  notes,
  isBookmarked,
  bunchItems,
  bunchGroupPosition,
  mode,
}: EnrichedVerseProps) {
  // Bunch grouping border styling
  const bunchBorderClass = useMemo(() => {
    if (!bunchGroupPosition) return "";
    const base = "border-l-2 border-violet-300 dark:border-violet-600 pl-3";
    switch (bunchGroupPosition) {
      case "first":
        return `${base} rounded-tl-md pt-2`;
      case "last":
        return `${base} rounded-bl-md pb-2`;
      case "middle":
        return base;
      case "single":
        return `${base} rounded-l-md py-1`;
      default:
        return "";
    }
  }, [bunchGroupPosition]);

  if (mode === "paragraph") {
    return (
      <span
        id={`verse-${verse.number}`}
        className={`${bunchGroupPosition ? "bg-violet-50/40 dark:bg-violet-950/20" : ""}`}
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

  // Verse-by-verse mode
  return (
    <div
      id={`verse-${verse.number}`}
      className={`group relative leading-relaxed text-foreground ${bunchBorderClass}`}
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

/* ── Compute bunch group positions for contiguous verse runs ── */
function computeBunchPositions(
  verses: NormalisedVerse[],
  bunchMap: Map<number, VerseBunchItemWithName[]>,
): Map<number, "first" | "middle" | "last" | "single" | null> {
  const positions = new Map<number, "first" | "middle" | "last" | "single" | null>();

  for (let i = 0; i < verses.length; i++) {
    const vn = verses[i].number;
    const hasBunch = (bunchMap.get(vn)?.length ?? 0) > 0;

    if (!hasBunch) {
      positions.set(vn, null);
      continue;
    }

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

/* ── Main BibleReader ── */
export function BibleReader() {
  const [versionId, setVersionId] = useState<number | undefined>(undefined);
  const [bookUsfm, setBookUsfm] = useState<string | undefined>(undefined);
  const [chapterIdx, setChapterIdx] = useState<number>(0);
  const [mode, setMode] = useState<ReadingMode>("verse");

  // Data hooks
  const { data: versions, isLoading: versionsLoading } = useBibleVersions();
  const { data: index, isLoading: indexLoading } = useBibleIndex(versionId);

  // Derive current book & chapter
  const currentBook: BibleBookMeta | undefined = useMemo(
    () => index?.books?.find((b) => b.id === bookUsfm),
    [index, bookUsfm],
  );

  const currentChapter = currentBook?.chapters?.[chapterIdx];
  const verseIds = useMemo(
    () => currentChapter?.verses?.map((v) => v.passage_id),
    [currentChapter],
  );

  // ── Unified concurrent data hook ──
  const {
    data: chapterData,
    isLoading,
  } = useBibleChapterData(
    versionId,
    bookUsfm,
    currentChapter?.id,
    verseIds,
  );

  const verses = chapterData?.verses ?? [];
  const hasVerses = verses.length > 0;

  // Build lookup maps
  const highlightMap = useMemo(
    () => groupByVerse(chapterData?.highlights ?? []),
    [chapterData?.highlights],
  );
  const noteMap = useMemo(
    () => groupByVerse(chapterData?.notes ?? []),
    [chapterData?.notes],
  );
  const bookmarkSet = useMemo(
    () => new Set((chapterData?.bookmarks ?? []).map((b) => b.verse_number)),
    [chapterData?.bookmarks],
  );
  const bunchMap = useMemo(
    () => groupByVerse(chapterData?.bunchItems ?? []),
    [chapterData?.bunchItems],
  );
  const bunchPositions = useMemo(
    () => computeBunchPositions(verses, bunchMap),
    [verses, bunchMap],
  );

  // Navigation
  const totalChapters = currentBook?.chapters?.length ?? 0;
  const canPrev = chapterIdx > 0;
  const canNext = chapterIdx < totalChapters - 1;

  // Auto-select BSB version & first book
  React.useEffect(() => {
    if (versions?.length && !versionId) {
      const bsb = versions.find(
        (v) => v.abbreviation === "BSB" || v.localized_abbreviation === "BSB",
      );
      setVersionId(bsb ? bsb.id : versions[0].id);
    }
  }, [versions, versionId]);

  React.useEffect(() => {
    if (index?.books?.length && !bookUsfm) {
      setBookUsfm(index.books[0].id);
      setChapterIdx(0);
    }
  }, [index, bookUsfm]);

  // Render helper for enriched verses
  const renderVerses = useCallback(
    (renderMode: ReadingMode) => (
      <section className={renderMode === "paragraph" ? "leading-[1.9] text-foreground" : "space-y-3"}>
        {verses.map((v) => (
          <EnrichedVerse
            key={v.number}
            verse={v}
            highlights={highlightMap.get(v.number) ?? []}
            notes={noteMap.get(v.number) ?? []}
            isBookmarked={bookmarkSet.has(v.number)}
            bunchItems={bunchMap.get(v.number) ?? []}
            bunchGroupPosition={bunchPositions.get(v.number) ?? null}
            mode={renderMode}
          />
        ))}
      </section>
    ),
    [verses, highlightMap, noteMap, bookmarkSet, bunchMap, bunchPositions],
  );

  return (
    <article className="min-h-screen bg-background">
      {/* ── Toolbar ── */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2 px-4 py-3">
          {/* Version selector */}
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

          {/* Book selector */}
          <Select
            value={bookUsfm}
            onValueChange={(v) => {
              setBookUsfm(v);
              setChapterIdx(0);
            }}
            disabled={!index}
          >
            <SelectTrigger className="w-[140px] sm:w-[170px] text-xs sm:text-sm">
              <SelectValue placeholder={indexLoading ? "Loading…" : "Book"} />
            </SelectTrigger>
            <SelectContent>
              {index?.books?.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Chapter selector */}
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
                <SelectItem key={ch.id} value={i.toString()}>
                  {ch.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Mode toggle */}
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
      <div className="mx-auto max-w-3xl px-5 sm:px-8 py-8 sm:py-12">
        {/* Chapter heading */}
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

        {/* Content */}
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
              {renderVerses(mode)}
            </motion.div>
          ) : !versionId ? (
            <motion.div
              {...fadeIn}
              className="flex flex-col items-center justify-center py-20 text-muted-foreground"
            >
              <BookOpen className="mb-4 h-12 w-12 opacity-40" />
              <p className="text-lg font-medium">Select a Bible version to begin reading</p>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* ── Chapter navigation ── */}
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
    </article>
  );
}

export default BibleReader;
