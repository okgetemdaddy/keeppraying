import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { X, Pin, CalendarPlus, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useWordStudy } from "@/hooks/useWordStudy";

type Tab = "word" | "refs" | "note";

export interface ReferenceBloomProps {
  anchorPoint: { x: number; y: number };
  word: string;
  verseNumber: number;
  bookUsfm: string;
  chapter: string;
  versionId: number;
  verseText: string;
  defaultTab?: Tab;
  onClose: () => void;
  onNavigate: (bookUsfm: string, chapter: number, verse?: number) => void;
  onPinToMargin?: () => void;
  onAddToPlan?: () => void;
}

const TABS: { key: Tab; label: string }[] = [
  { key: "word", label: "Word" },
  { key: "refs", label: "Refs" },
  { key: "note", label: "Note" },
];

const WIDTH = 280;
const MAX_HEIGHT = 360;

function clampPosition(x: number, y: number) {
  const pad = 12;
  const clampedX = Math.min(Math.max(x - WIDTH / 2, pad), window.innerWidth - WIDTH - pad);
  const clampedY = Math.min(Math.max(y + 12, pad), window.innerHeight - MAX_HEIGHT - pad);
  return { left: clampedX, top: clampedY };
}

export function ReferenceBloom({
  anchorPoint,
  word,
  verseNumber,
  bookUsfm,
  chapter,
  versionId,
  verseText,
  defaultTab,
  onClose,
  onNavigate,
  onPinToMargin,
  onAddToPlan,
}: ReferenceBloomProps) {
  const wordCount = word.trim().split(/\s+/).length;
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab ?? (wordCount <= 2 ? "word" : "refs"));
  const cardRef = useRef<HTMLDivElement>(null);
  const pos = clampPosition(anchorPoint.x, anchorPoint.y);

  const { data, isLoading, error } = useWordStudy(
    word,
    verseText,
    bookUsfm,
    chapter,
    verseNumber,
    versionId,
  );

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay to avoid the triggering click
    const timer = setTimeout(() => {
      window.addEventListener("mousedown", handler);
    }, 100);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("mousedown", handler);
    };
  }, [onClose]);

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="fixed z-[60] rounded-xl border border-border bg-card shadow-lg bible-dark:shadow-[0_0_12px_rgba(255,215,0,0.05)] flex flex-col"
      style={{ left: pos.left, top: pos.top, width: WIDTH, maxHeight: MAX_HEIGHT }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <span className="font-display text-sm font-semibold text-foreground truncate max-w-[200px]">
          "{word}"
        </span>
        <button
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Tab pills */}
      <div className="flex items-center gap-1 px-3 pb-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-2.5 py-1 text-[0.65rem] font-medium rounded-full transition-colors ${
              activeTab === tab.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 pb-2 min-h-0" style={{ maxHeight: MAX_HEIGHT - 120 }}>
        {isLoading ? (
          <div className="space-y-3 py-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : error ? (
          <p className="text-xs text-destructive py-4 text-center">
            {(error as Error).message || "Failed to load word study"}
          </p>
        ) : data ? (
          <>
            {activeTab === "word" && <WordTab data={data} />}
            {activeTab === "refs" && <RefsTab data={data} onNavigate={onNavigate} />}
            {activeTab === "note" && <NoteTab data={data} />}
          </>
        ) : null}
      </div>

      {/* Bottom action bar */}
      <div className="flex items-center gap-2 border-t border-border px-3 py-2">
        {onPinToMargin && (
          <button
            onClick={onPinToMargin}
            className="flex items-center gap-1 text-[0.65rem] font-medium text-muted-foreground hover:text-foreground transition-colors"
            title="Pin to margin"
          >
            <Pin className="h-3.5 w-3.5" />
            Pin
          </button>
        )}
        {onAddToPlan && (
          <button
            onClick={onAddToPlan}
            className="flex items-center gap-1 text-[0.65rem] font-medium text-muted-foreground hover:text-foreground transition-colors"
            title="Add to plan"
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            Plan+
          </button>
        )}
      </div>
    </motion.div>
  );
}

/* ── Word tab ── */
function WordTab({ data }: { data: NonNullable<ReturnType<typeof useWordStudy>["data"]> }) {
  return (
    <div className="space-y-3 py-1">
      {/* Original word */}
      <div>
        <p className="font-display text-lg text-foreground leading-tight">{data.originalWord}</p>
        <p className="text-[0.7rem] text-muted-foreground italic">{data.transliteration}</p>
      </div>

      {/* Strong's + frequency */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-[0.6rem] font-mono font-semibold text-primary">
          {data.strongsNumber}
        </span>
        <span className="text-[0.65rem] text-muted-foreground">
          ~{data.frequency}× in {data.strongsNumber.startsWith("H") ? "OT" : "NT"}
        </span>
      </div>

      {/* Definition */}
      <p className="text-xs text-foreground leading-relaxed">{data.definition}</p>

      {/* Semantic range chips */}
      {data.semanticRange.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {data.semanticRange.map((s, i) => (
            <span
              key={i}
              className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[0.6rem] text-muted-foreground"
            >
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Refs tab ── */
function RefsTab({
  data,
  onNavigate,
}: {
  data: NonNullable<ReturnType<typeof useWordStudy>["data"]>;
  onNavigate: (bookUsfm: string, chapter: number, verse?: number) => void;
}) {
  if (!data.crossReferences?.length) {
    return (
      <p className="text-xs text-muted-foreground py-4 text-center">No cross-references found</p>
    );
  }

  return (
    <div className="space-y-2 py-1">
      {data.crossReferences.slice(0, 6).map((ref, i) => (
        <button
          key={i}
          onClick={() => onNavigate(ref.bookUsfm, ref.chapter, ref.verse)}
          className="w-full text-left rounded-lg border border-border p-2 hover:bg-muted/60 transition-colors group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[0.7rem] font-semibold text-primary">{ref.reference}</span>
            <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="text-[0.65rem] text-muted-foreground font-serif leading-snug mt-0.5 line-clamp-2">
            {ref.preview}
          </p>
          <p className="text-[0.55rem] text-primary/60 mt-0.5 italic">{ref.relevance}</p>
        </button>
      ))}
    </div>
  );
}

/* ── Note tab ── */
function NoteTab({ data }: { data: NonNullable<ReturnType<typeof useWordStudy>["data"]> }) {
  return (
    <div className="py-2">
      <p className="text-xs text-foreground leading-relaxed font-serif">{data.contextualNote}</p>
    </div>
  );
}
