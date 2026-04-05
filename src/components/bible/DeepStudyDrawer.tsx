import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, BookOpen, Sparkles, ScrollText, ArrowUpRight, MoreVertical, Trash2, Share2, Eye } from "lucide-react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { renderWithVerseLinks } from "@/lib/renderWithVerseLinks";
import { USFM_BOOK_NAMES } from "@/lib/usfmBooks";
import VerseLink from "@/components/VerseLink";
import type { EnrichmentPayload, EnrichmentCard, EnrichmentCrossRef } from "@/hooks/useChapterEnrichment";

type Tab = "exegesis" | "journals" | "cross-references";

const CARD_TYPE_BADGES: Record<string, { label: string; className: string }> = {
  exegesis: { label: "Exegesis", className: "bg-amber-500/20 text-amber-300" },
  word_study: { label: "Word Study", className: "bg-cyan-500/20 text-cyan-300" },
  historical_parallel: { label: "Historical", className: "bg-emerald-500/20 text-emerald-300" },
  theological_depth: { label: "Theology", className: "bg-violet-500/20 text-violet-300" },
};

interface JournalEntry {
  id: string;
  content: string;
  lens_used: string;
  model_used: string;
  tags?: string[];
  summary_line?: string;
  created_at: string;
}

interface DeepStudyDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: EnrichmentPayload | null;
  bookUsfm: string;
  chapterNumber: number;
  journals?: JournalEntry[];
  isLoadingMore?: boolean;
  title?: string;
  onDeleteJournal?: (id: string) => void;
  onShareJournal?: (id: string, title: string, preview: string) => void;
}

/* ── Ornamental SVG Dividers ── */
function OliveBranchDivider() {
  return (
    <div className="flex items-center justify-center gap-3 py-4 opacity-30">
      <svg width="40" height="16" viewBox="0 0 40 16" fill="none" className="text-amber-400">
        <path d="M20 8C14 4 6 2 2 6s4 6 8 4 6-4 10-2" stroke="currentColor" strokeWidth="1.2" fill="none" />
        <path d="M20 8C26 4 34 2 38 6s-4 6-8 4-6-4-10-2" stroke="currentColor" strokeWidth="1.2" fill="none" />
      </svg>
    </div>
  );
}

function ScrollOrnament() {
  return (
    <div className="flex items-center justify-center gap-4 py-3 opacity-20">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-400/50" />
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-amber-400 shrink-0">
        <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1" />
        <path d="M10 3v2M10 15v2M3 10h2M15 10h2" stroke="currentColor" strokeWidth="0.8" />
      </svg>
      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-400/50" />
    </div>
  );
}

function SegmentedControl({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "exegesis", label: "Exegesis", icon: Sparkles },
    { id: "journals", label: "Journals", icon: ScrollText },
    { id: "cross-references", label: "Cross-Refs", icon: ArrowUpRight },
  ];

  return (
    <div className="flex gap-1 bg-neutral-800/60 p-1 rounded-xl">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
            active === id
              ? "bg-neutral-700 shadow-sm text-white"
              : "text-neutral-400 hover:text-neutral-300"
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}

function ExegesisTab({ data, bookUsfm, chapterNumber, isLoadingMore }: {
  data: EnrichmentPayload;
  bookUsfm: string;
  chapterNumber: number;
  isLoadingMore?: boolean;
}) {
  const bookName = USFM_BOOK_NAMES[bookUsfm] || bookUsfm;

  return (
    <div className="space-y-6">
      {data.cards.map((card, idx) => {
        const badge = CARD_TYPE_BADGES[card.cardType || "exegesis"];
        const anchorRef = card.anchors[0] === card.anchors[1]
          ? `${bookName} ${chapterNumber}:${card.anchors[0]}`
          : `${bookName} ${chapterNumber}:${card.anchors[0]}-${card.anchors[1]}`;

        return (
          <motion.article
            key={card.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.06, duration: 0.3 }}
            className="rounded-2xl border border-neutral-700/50 bg-neutral-800/40 p-5 space-y-4"
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[0.6rem] font-medium px-2 py-0.5 rounded-full ${badge.className}`}>
                  {badge.label}
                </span>
                <span className="text-[0.65rem] text-neutral-500 font-mono">
                  <VerseLink reference={anchorRef} className="text-[0.65rem]" />
                </span>
              </div>
              <h3 className="text-base font-bold text-neutral-100 leading-snug font-serif">
                {card.title}
              </h3>
            </div>

            {/* Pull-quote style body */}
            <div className="text-sm leading-[1.85] text-neutral-200/90 font-serif space-y-3 whitespace-pre-line">
              {renderWithVerseLinks(card.body)}
            </div>

            {card.citations.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-3 border-t border-neutral-700/40">
                {card.citations.map((cite, i) => (
                  <VerseLink key={i} reference={cite} className="text-[0.65rem]" />
                ))}
              </div>
            )}
          </motion.article>
        );
      })}

      {/* Ornamental divider between primary and secondary */}
      {data.cards.length > 0 && <OliveBranchDivider />}

      {isLoadingMore && (
        <div className="space-y-4 animate-pulse">
          <div className="rounded-2xl border border-neutral-700/30 bg-neutral-800/20 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-4 w-20 bg-cyan-500/10 rounded-full" />
              <div className="h-3 w-24 bg-neutral-700/40 rounded" />
            </div>
            <div className="h-4 w-48 bg-neutral-700/30 rounded" />
            <div className="h-3 w-full bg-neutral-700/20 rounded" />
            <div className="h-3 w-4/5 bg-neutral-700/20 rounded" />
          </div>
          <p className="text-center text-[0.65rem] text-neutral-500 italic">
            Deeper insights loading…
          </p>
        </div>
      )}
    </div>
  );
}

function JournalsTab({ journals, onDelete, onShare }: {
  journals: JournalEntry[];
  onDelete?: (id: string) => void;
  onShare?: (id: string, title: string, preview: string) => void;
}) {
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  if (!journals.length) {
    return (
      <div className="text-center py-16">
        <ScrollText className="h-10 w-10 mx-auto text-neutral-600 mb-3" />
        <p className="text-sm text-neutral-300 font-medium">No journal entries yet</p>
        <p className="text-[0.65rem] text-neutral-500 mt-1">
          Journal entries will appear here after Deep Study completes
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {journals.map((j, idx) => {
          const modelLabel = j.model_used.includes("grok") ? "Deep Reasoning" : "Scholarly Lens";
          return (
            <motion.article
              key={j.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="rounded-2xl border border-neutral-700/50 bg-neutral-800/40 p-5 space-y-3 relative"
            >
              {/* 3-dot menu */}
              <div className="absolute top-3 right-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1.5 rounded-lg hover:bg-neutral-700/50 transition-colors">
                      <MoreVertical className="h-4 w-4 text-neutral-500" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[160px]">
                    {onShare && (
                      <DropdownMenuItem onClick={() => onShare(j.id, j.summary_line || "Journal Entry", j.content.slice(0, 200))}>
                        <Share2 className="h-3.5 w-3.5 mr-2" />
                        Share
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <DropdownMenuItem
                        onClick={() => setDeleteTarget(j.id)}
                        className="text-red-400 focus:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                        Delete Journal
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex items-center gap-2 flex-wrap pr-8">
                <span className="text-[0.6rem] font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">
                  {j.lens_used.replace(/_/g, " ")}
                </span>
                <span className="text-[0.55rem] px-1.5 py-0.5 rounded bg-neutral-700/50 text-neutral-500">
                  {modelLabel}
                </span>
                <span className="text-[0.6rem] text-neutral-600 ml-auto">
                  {new Date(j.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              </div>

              {j.summary_line && (
                <blockquote className="border-l-2 border-amber-500/40 pl-3 text-xs text-amber-400/70 italic font-serif">
                  {j.summary_line}
                </blockquote>
              )}

              <ScrollOrnament />

              <div className="text-sm leading-[1.85] text-neutral-200/90 font-serif whitespace-pre-line">
                {renderWithVerseLinks(j.content)}
              </div>

              {j.tags && j.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-2">
                  {j.tags.map((tag) => (
                    <span key={tag} className="text-[0.55rem] bg-amber-400/10 text-amber-400/70 rounded px-1.5 py-0.5">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </motion.article>
          );
        })}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Journal Entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this journal reflection. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (deleteTarget && onDelete) onDelete(deleteTarget);
                setDeleteTarget(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function CrossRefsTab({ crossRefs, bookUsfm, chapterNumber }: {
  crossRefs: EnrichmentCrossRef[];
  bookUsfm: string;
  chapterNumber: number;
}) {
  const bookName = USFM_BOOK_NAMES[bookUsfm] || bookUsfm;

  if (!crossRefs.length) {
    return (
      <div className="text-center py-16">
        <ArrowUpRight className="h-10 w-10 mx-auto text-neutral-600 mb-3" />
        <p className="text-sm text-neutral-300">No cross-references found</p>
      </div>
    );
  }

  const typeColors: Record<string, string> = {
    quotation: "text-amber-400",
    allusion: "text-cyan-400",
    parallel: "text-emerald-400",
    contrast: "text-rose-400",
    fulfillment: "text-violet-400",
  };

  return (
    <div className="space-y-2">
      {crossRefs.map((ref, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border border-neutral-700/40 bg-neutral-800/30 px-4 py-3">
          <span className="text-xs font-mono text-neutral-400 shrink-0">
            {bookName} {chapterNumber}:{ref.from}
          </span>
          <span className={`text-sm ${typeColors[ref.type] || "text-neutral-400"}`}>→</span>
          <VerseLink reference={ref.to} className="text-sm flex-1" />
          <span className={`text-[0.6rem] italic ${typeColors[ref.type] || "text-neutral-500"}`}>
            {ref.type}
          </span>
        </div>
      ))}
    </div>
  );
}

export function DeepStudyDrawer({
  open,
  onOpenChange,
  data,
  bookUsfm,
  chapterNumber,
  journals = [],
  isLoadingMore,
  title,
  onDeleteJournal,
  onShareJournal,
}: DeepStudyDrawerProps) {
  const [activeTab, setActiveTab] = useState<Tab>("exegesis");
  const bookName = USFM_BOOK_NAMES[bookUsfm] || bookUsfm;
  const displayTitle = title || `${bookName} ${chapterNumber}`;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[80vh] bg-[#1C1C1E] border-neutral-800 rounded-t-2xl flex flex-col">
        {/* Header */}
        <div className="px-5 pt-4 pb-3 border-b border-neutral-800 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Eye className="h-4.5 w-4.5 text-amber-400 shrink-0" />
              <h2 className="text-base font-bold text-neutral-100 truncate">
                Bible Sight — {displayTitle}
              </h2>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="p-1.5 rounded-lg hover:bg-neutral-700/50 transition-colors shrink-0 ml-2"
            >
              <X className="h-4 w-4 text-neutral-400" />
            </button>
          </div>

          <SegmentedControl active={activeTab} onChange={setActiveTab} />
        </div>

        {/* Scrollable content */}
        <ScrollArea className="flex-1 px-5 py-4">
          {!data ? (
            <div className="text-center py-16">
              <BookOpen className="h-10 w-10 mx-auto text-neutral-600 mb-3" />
              <p className="text-sm text-neutral-300">No study data yet</p>
              <p className="text-[0.65rem] text-neutral-500 mt-2 italic">
                "The unfolding of your words gives light" — Psalm 119:130
              </p>
            </div>
          ) : activeTab === "exegesis" ? (
            <ExegesisTab
              data={data}
              bookUsfm={bookUsfm}
              chapterNumber={chapterNumber}
              isLoadingMore={isLoadingMore}
            />
          ) : activeTab === "journals" ? (
            <JournalsTab
              journals={journals}
              onDelete={onDeleteJournal}
              onShare={onShareJournal}
            />
          ) : (
            <CrossRefsTab
              crossRefs={data.crossRefs}
              bookUsfm={bookUsfm}
              chapterNumber={chapterNumber}
            />
          )}

          {/* Bottom breathing room */}
          <div className="h-8" />
        </ScrollArea>

        {/* Footer watermark */}
        <div className="shrink-0 border-t border-neutral-800/60 px-5 py-2.5 flex items-center justify-center">
          <p className="text-[0.55rem] text-neutral-600 italic tracking-wide">
            Bible Sight · KeepRead.ing — I do this for HIS glory
          </p>
        </div>
      </DrawerContent>
    </Drawer>
  );
}