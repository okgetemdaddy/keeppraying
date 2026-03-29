import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, ChevronLeft, ChevronRight, AlignJustify, List } from "lucide-react";
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
  useBibleChapter,
  useBibleChapterVerses,
  type BibleBookMeta,
  type NormalisedVerse,
} from "@/hooks/useBibleReader";

type ReadingMode = "verse" | "paragraph";

const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.25 },
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

/* ── Verse-by-Verse renderer ── */
function VerseByVerse({ verses }: { verses: NormalisedVerse[] }) {
  return (
    <section className="space-y-3">
      {verses.map((v) => (
        <p key={v.number} className="leading-relaxed text-foreground">
          <sup className="mr-1 text-xs font-semibold text-primary/70 select-none">
            {v.number}
          </sup>
          {v.text}
        </p>
      ))}
    </section>
  );
}

/* ── Paragraph renderer ── */
function ParagraphMode({ verses }: { verses: NormalisedVerse[] }) {
  return (
    <section className="leading-[1.9] text-foreground">
      {verses.map((v) => (
        <span key={v.number}>
          <sup className="mx-0.5 text-[0.65rem] font-semibold text-primary/60 select-none align-super">
            {v.number}
          </sup>
          {v.text}{" "}
        </span>
      ))}
    </section>
  );
}

/* ── Fallback for chapter text without verse structure ── */
function ChapterPlainText({ text, reference }: { text: string; reference: string }) {
  return (
    <section className="leading-[1.9] text-foreground">
      <p>{text}</p>
    </section>
  );
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

  // Fetch verse-by-verse data
  const {
    data: verses,
    isLoading: versesLoading,
  } = useBibleChapterVerses(
    versionId,
    bookUsfm,
    currentChapter?.id,
    verseIds,
  );

  // Fallback: full chapter text
  const {
    data: chapterData,
    isLoading: chapterLoading,
  } = useBibleChapter(
    versionId,
    currentChapter?.passage_id,
  );

  const isLoading = versesLoading || chapterLoading;
  const hasVerses = verses && verses.length > 0;

  // Navigation
  const totalChapters = currentBook?.chapters?.length ?? 0;
  const canPrev = chapterIdx > 0;
  const canNext = chapterIdx < totalChapters - 1;

  // Auto-select first version & book
  React.useEffect(() => {
    if (versions?.length && !versionId) {
      setVersionId(versions[0].id);
    }
  }, [versions, versionId]);

  React.useEffect(() => {
    if (index?.books?.length && !bookUsfm) {
      setBookUsfm(index.books[0].id);
      setChapterIdx(0);
    }
  }, [index, bookUsfm]);

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
              {currentBook.title}{" "}
              {currentChapter.title}
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
              {mode === "verse" ? (
                <VerseByVerse verses={verses} />
              ) : (
                <ParagraphMode verses={verses} />
              )}
            </motion.div>
          ) : chapterData ? (
            <motion.div key="plain" {...fadeIn} className="font-body text-base sm:text-lg">
              <ChapterPlainText
                text={chapterData.content}
                reference={chapterData.reference}
              />
            </motion.div>
          ) : !versionId ? (
            <motion.div {...fadeIn} className="flex flex-col items-center justify-center py-20 text-muted-foreground">
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
