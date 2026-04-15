import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface ChapterThumbnailStripProps {
  open: boolean;
  onClose: () => void;
  currentChapterIdx: number;
  totalChapters: number;
  bookTitle?: string;
  chapterTitles: string[];
  onNavigate: (chapterIdx: number) => void;
}

export function ChapterThumbnailStrip({
  open,
  onClose,
  currentChapterIdx,
  totalChapters,
  bookTitle,
  chapterTitles,
  onNavigate,
}: ChapterThumbnailStripProps) {
  // Show up to 5 chapters centered on current
  const start = Math.max(0, currentChapterIdx - 2);
  const end = Math.min(totalChapters, start + 5);
  const visibleIndices = Array.from({ length: end - start }, (_, i) => start + i);

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

          {/* Strip */}
          <motion.div
            initial={{ y: "-100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "-100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-0 inset-x-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border rounded-b-3xl shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <span className="text-sm font-semibold text-foreground">
                {bookTitle ?? "Chapters"}
              </span>
              <button
                onClick={onClose}
                className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Thumbnails */}
            <div className="flex items-center justify-center gap-3 px-5 pb-5 overflow-x-auto">
              {currentChapterIdx > 0 && (
                <button
                  onClick={() => onNavigate(Math.max(0, currentChapterIdx - 3))}
                  className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-muted/50 text-muted-foreground hover:bg-muted transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}

              {visibleIndices.map((idx) => {
                const isCurrent = idx === currentChapterIdx;
                return (
                  <motion.button
                    key={idx}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      onNavigate(idx);
                      onClose();
                    }}
                    className={`shrink-0 flex flex-col items-center justify-center rounded-2xl border transition-all ${
                      isCurrent
                        ? "border-primary bg-primary/10 ring-2 ring-primary/30 shadow-lg w-24 h-28"
                        : "border-border/50 bg-muted/30 hover:bg-muted/60 w-20 h-24"
                    }`}
                  >
                    {/* Chapter number */}
                    <span
                      className={`text-2xl font-bold ${
                        isCurrent ? "text-primary" : "text-muted-foreground/60"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span
                      className={`text-[0.6rem] mt-1 ${
                        isCurrent ? "text-primary font-semibold" : "text-muted-foreground"
                      }`}
                    >
                      {chapterTitles[idx] ?? `Ch ${idx + 1}`}
                    </span>
                    {isCurrent && (
                      <span className="text-[0.5rem] text-primary/70 font-medium mt-0.5">
                        CURRENT
                      </span>
                    )}
                  </motion.button>
                );
              })}

              {currentChapterIdx < totalChapters - 1 && (
                <button
                  onClick={() => onNavigate(Math.min(totalChapters - 1, currentChapterIdx + 3))}
                  className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-muted/50 text-muted-foreground hover:bg-muted transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
