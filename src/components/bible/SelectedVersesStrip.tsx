import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

export interface SelectedVerse {
  versionId: number;
  bookUsfm: string;
  bookTitle: string;
  chapterNumber: string;
  verseNumber: number;
  verseText?: string;
}

/** Short label for a verse, e.g. "Gen 1:3" */
function verseLabel(v: SelectedVerse): string {
  // Abbreviate book title: first 3 chars unless short
  const abbr = v.bookTitle.length <= 5 ? v.bookTitle : v.bookTitle.slice(0, 3);
  return `${abbr} ${v.chapterNumber}:${v.verseNumber}`;
}

interface SelectedVersesStripProps {
  selections: SelectedVerse[];
  onRemove: (v: SelectedVerse) => void;
  onNavigate: (v: SelectedVerse) => void;
  onCreateBunch: () => void;
}

export function SelectedVersesStrip({
  selections,
  onRemove,
  onNavigate,
  onCreateBunch,
}: SelectedVersesStripProps) {
  if (selections.length === 0) return null;

  return (
    <div className="border-b border-border bg-primary/5">
      <div className="mx-auto max-w-3xl px-4 py-2">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            <span className="text-[0.6rem] font-semibold text-primary/70 uppercase tracking-wider shrink-0 mr-1">
              Selected
            </span>
            <AnimatePresence mode="popLayout">
              {selections.map((v) => {
                const key = `${v.bookUsfm}.${v.chapterNumber}.${v.verseNumber}`;
                return (
                  <motion.button
                    key={key}
                    layout
                    initial={{ opacity: 0, scale: 0.6, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.5, y: -5 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    onClick={() => onNavigate(v)}
                    className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[0.7rem] font-medium text-primary hover:bg-primary/20 transition-colors whitespace-nowrap group"
                  >
                    {verseLabel(v)}
                    <span
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(v);
                      }}
                      className="ml-0.5 inline-flex items-center justify-center rounded-full h-3.5 w-3.5 hover:bg-destructive/20 hover:text-destructive transition-colors"
                    >
                      <X className="h-2.5 w-2.5" />
                    </span>
                  </motion.button>
                );
              })}
            </AnimatePresence>

            {selections.length >= 2 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="shrink-0 ml-1"
              >
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onCreateBunch}
                  className="h-6 text-[0.65rem] gap-1 rounded-full border-primary/30 text-primary hover:bg-primary/10"
                >
                  <Sparkles className="h-3 w-3" />
                  Create Bunch
                </Button>
              </motion.div>
            )}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  );
}
