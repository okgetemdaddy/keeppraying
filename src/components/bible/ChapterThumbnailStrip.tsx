import React, { useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { generateChapterMinimap } from "@/lib/minimap";
import type { MinimapStroke, MinimapHighlight } from "@/lib/minimap";

// iPadOS: Maps to UICollectionView with UICollectionViewCompositionalLayout.orthogonalScrollingBehavior = .continuous

interface ChapterAnnotationData {
  strokes: MinimapStroke[];
  highlights: MinimapHighlight[];
  lastEditedAt: string | null;
}

interface ChapterThumbnailStripProps {
  open: boolean;
  onClose: () => void;
  currentChapterIdx: number;
  totalChapters: number;
  bookTitle?: string;
  chapterTitles: string[];
  onNavigate: (chapterIdx: number) => void;
  chapterAnnotations?: Map<number, ChapterAnnotationData>;
}

/** Format a date string as relative time (e.g. "2d ago", "5h ago") */
function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

/** Memoized thumbnail card for a single chapter */
const ChapterCard = React.memo(function ChapterCard({
  chapterIdx,
  isCurrent,
  chapterTitle,
  annotationData,
  onNavigate,
  onClose,
}: {
  chapterIdx: number;
  isCurrent: boolean;
  chapterTitle: string;
  annotationData?: ChapterAnnotationData;
  onNavigate: (idx: number) => void;
  onClose: () => void;
}) {
  const minimapSvg = useMemo(() => {
    if (!annotationData || (annotationData.strokes.length === 0 && annotationData.highlights.length === 0)) {
      return "";
    }
    return generateChapterMinimap(
      annotationData.strokes,
      annotationData.highlights,
      120,
      168
    );
  }, [annotationData]);

  const hasStudyData = minimapSvg.length > 0;

  return (
    <button
      data-chapter-card={chapterIdx}
      onClick={() => { onNavigate(chapterIdx); onClose(); }}
      className={`shrink-0 flex flex-col items-center rounded-lg border transition-all w-[120px] h-[168px] overflow-hidden snap-center ${
        isCurrent
          ? "ring-1 ring-amber-500/50 border-amber-500/30 bg-zinc-900/70"
          : "border-zinc-800/50 bg-zinc-900/50 hover:bg-zinc-800/60"
      }`}
    >
      {/* Chapter number */}
      <span className={`text-[0.65rem] font-semibold pt-2 ${
        isCurrent ? "text-amber-400" : "text-zinc-400"
      }`}>
        {chapterTitle || `Ch ${chapterIdx + 1}`}
      </span>

      {/* Minimap or empty state */}
      <div className="flex-1 w-full px-1.5 py-1 flex items-center justify-center">
        {hasStudyData ? (
          <div
            className="w-full h-full"
            dangerouslySetInnerHTML={{ __html: minimapSvg }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 opacity-10">
            {/* Ghosted abstract text lines */}
            <div className="w-[70%] h-[2px] bg-zinc-400 rounded-full" />
            <div className="w-[85%] h-[2px] bg-zinc-400 rounded-full" />
            <div className="w-[60%] h-[2px] bg-zinc-400 rounded-full" />
            <div className="w-[75%] h-[2px] bg-zinc-400 rounded-full" />
          </div>
        )}
      </div>

      {/* Footer: timestamp or "Not yet studied" */}
      <span className={`text-[0.55rem] pb-2 ${
        hasStudyData ? "text-zinc-500" : "text-zinc-600 italic"
      }`}>
        {hasStudyData && annotationData?.lastEditedAt
          ? relativeTime(annotationData.lastEditedAt)
          : "Not yet studied"}
      </span>
    </button>
  );
});

export function ChapterThumbnailStrip({
  open,
  onClose,
  currentChapterIdx,
  totalChapters,
  bookTitle,
  chapterTitles,
  onNavigate,
  chapterAnnotations,
}: ChapterThumbnailStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to center current chapter on open
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      const el = scrollRef.current?.querySelector(`[data-chapter-card="${currentChapterIdx}"]`);
      el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }, 100);
    return () => clearTimeout(timer);
  }, [open, currentChapterIdx]);

  const hasAnyAnnotations = chapterAnnotations && chapterAnnotations.size > 0;
  const indices = Array.from({ length: totalChapters }, (_, i) => i);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer — slides down from top */}
          <motion.div
            initial={{ y: "-100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "-100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-0 inset-x-0 z-50 bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-800 rounded-b-2xl shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <span className="text-sm font-semibold text-foreground">
                {bookTitle ?? "Chapters"}
              </span>
              <button
                onClick={onClose}
                className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-zinc-800 transition-colors"
              >
                <X className="h-4 w-4 text-zinc-400" />
              </button>
            </div>

            {/* Scrollable chapter cards */}
            <div
              ref={scrollRef}
              className="flex items-stretch gap-2.5 px-4 pb-4 pt-1 overflow-x-auto"
              style={{ scrollSnapType: "x mandatory" }}
            >
              {!hasAnyAnnotations && totalChapters > 0 ? (
                // Full-book empty state with cards still rendered
                <>
                  {indices.map((idx) => (
                    <ChapterCard
                      key={idx}
                      chapterIdx={idx}
                      isCurrent={idx === currentChapterIdx}
                      chapterTitle={chapterTitles[idx] ?? `Ch ${idx + 1}`}
                      onNavigate={onNavigate}
                      onClose={onClose}
                    />
                  ))}
                </>
              ) : (
                indices.map((idx) => (
                  <ChapterCard
                    key={idx}
                    chapterIdx={idx}
                    isCurrent={idx === currentChapterIdx}
                    chapterTitle={chapterTitles[idx] ?? `Ch ${idx + 1}`}
                    annotationData={chapterAnnotations?.get(idx + 1)}
                    onNavigate={onNavigate}
                    onClose={onClose}
                  />
                ))
              )}
            </div>

            {/* Muted hint when no annotations exist anywhere */}
            {!hasAnyAnnotations && (
              <p className="text-center text-[0.6rem] text-zinc-600 pb-3 -mt-1">
                Your study thumbnails will appear here as you read and annotate.
              </p>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
