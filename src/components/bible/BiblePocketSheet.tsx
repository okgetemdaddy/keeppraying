import React, { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, PenTool, StickyNote, Clock, Lightbulb, BookMarked, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Annotation } from "@/hooks/useAnnotations";
import type { InkStroke } from "./InkOverlay";
import { HowToGuide } from "./HowToGuide";

type PocketTab = "notes" | "guide" | "journal";

interface BiblePocketSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapterTitle?: string;
  chapterAnnotations: Annotation[];
  inkStrokes: InkStroke[];
  journalAnnotations?: Annotation[];
  onTryAction?: (actionId: string) => void;
  /** Which tab to open to (controlled externally for onboarding) */
  defaultTab?: PocketTab;
}

export function BiblePocketSheet({
  open,
  onOpenChange,
  chapterTitle,
  chapterAnnotations,
  inkStrokes,
  journalAnnotations = [],
  onTryAction,
  defaultTab,
}: BiblePocketSheetProps) {
  const [activeTab, setActiveTab] = useState<PocketTab>(defaultTab ?? "notes");

  // Sync defaultTab when it changes (for onboarding flow)
  React.useEffect(() => {
    if (defaultTab) setActiveTab(defaultTab);
  }, [defaultTab]);

  const sortedAnnotations = useMemo(
    () =>
      [...chapterAnnotations].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      ),
    [chapterAnnotations],
  );

  const sortedJournalAnnotations = useMemo(
    () =>
      [...journalAnnotations].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      ),
    [journalAnnotations],
  );

  const inkCount = inkStrokes.length;
  const noteCount = sortedAnnotations.filter((a) => (a as any).typed_text).length;
  const totalAnnotations = sortedAnnotations.length;
  const journalCount = sortedJournalAnnotations.length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[85vw] sm:w-[420px] p-0 flex flex-col bg-[#1C1C1E] border-l border-neutral-800"
      >
        {/* Header */}
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-neutral-800">
          <SheetTitle className="text-left text-base font-bold text-neutral-100 flex items-center gap-2">
            <BookOpen className="h-4.5 w-4.5 text-amber-400" />
            Bible Pocket
          </SheetTitle>
          {chapterTitle && (
            <p className="text-[0.65rem] text-neutral-400 mt-0.5">{chapterTitle}</p>
          )}
        </SheetHeader>

        {/* Segmented Control — 3 tabs */}
        <div className="px-4 pt-3 pb-2">
          <div className="flex gap-1 bg-neutral-800/60 p-1 rounded-xl">
            {([
              { id: "notes" as const, icon: BookOpen, label: "Notes", badge: totalAnnotations },
              { id: "journal" as const, icon: BookMarked, label: "Journal", badge: journalCount },
              { id: "guide" as const, icon: Lightbulb, label: "Guide", badge: 0 },
            ]).map(({ id, icon: Icon, label, badge }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all relative",
                  activeTab === id
                    ? "bg-neutral-700 shadow-sm text-white"
                    : "text-neutral-400 hover:text-neutral-300",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                {badge > 0 && (
                  <span className="absolute -top-1 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-amber-400 text-neutral-900 text-[0.55rem] font-bold px-1">
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "notes" ? (
          <>
            {/* Stats strip */}
            <div className="flex items-center gap-4 px-5 py-2.5 border-b border-neutral-800 bg-neutral-800/30">
              <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                <PenTool className="h-3.5 w-3.5" />
                <span>{inkCount} strokes</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                <StickyNote className="h-3.5 w-3.5" />
                <span>{noteCount} notes</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                <BookOpen className="h-3.5 w-3.5" />
                <span>{totalAnnotations} total</span>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-3">
                {sortedAnnotations.length === 0 && inkCount === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="h-10 w-10 mx-auto text-neutral-600 mb-3" />
                    <p className="text-sm text-neutral-100 font-medium">
                      Your pocket is empty
                    </p>
                    <p className="text-[0.65rem] text-neutral-500 mt-1">
                      Start writing on the page or add voice notes
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Ink summary */}
                    {inkCount > 0 && (
                      <div className="rounded-2xl border border-neutral-700 bg-neutral-800/40 p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <PenTool className="h-3.5 w-3.5 text-amber-400" />
                          <span className="text-xs font-semibold text-neutral-100">Page Ink</span>
                        </div>
                        <p className="text-[0.65rem] text-neutral-400">
                          {inkCount} stroke{inkCount !== 1 ? "s" : ""} on this chapter
                        </p>
                      </div>
                    )}

                    {/* Annotations list */}
                    {sortedAnnotations.map((ann) => (
                      <div
                        key={ann.id}
                        className="rounded-2xl border border-neutral-700 bg-neutral-800/50 p-3 space-y-1.5"
                      >
                        <div className="flex items-center gap-2">
                          {(ann as any).typed_text ? (
                            <StickyNote className="h-3.5 w-3.5 text-amber-400" />
                          ) : (
                            <PenTool className="h-3.5 w-3.5 text-amber-400/60" />
                          )}
                          <span className="text-[0.6rem] text-neutral-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(ann.updated_at).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        {(ann as any).typed_text && (
                          <p className="text-xs text-neutral-200 line-clamp-3 leading-relaxed">
                            {(ann as any).typed_text}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1">
                          {ann.verse_ids.map((vid) => (
                            <span
                              key={vid}
                              className="text-[0.55rem] bg-amber-400/10 text-amber-400 rounded-md px-1.5 py-0.5 font-medium"
                            >
                              {vid}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </ScrollArea>
          </>
        ) : activeTab === "journal" ? (
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {sortedJournalAnnotations.length === 0 ? (
                <div className="text-center py-12">
                  <BookMarked className="h-10 w-10 mx-auto text-neutral-600 mb-3" />
                  <p className="text-sm text-neutral-100 font-medium">
                    No journal entries yet
                  </p>
                  <p className="text-[0.65rem] text-neutral-500 mt-1">
                    Open the Journal tool to write reflections for this chapter
                  </p>
                </div>
              ) : (
                sortedJournalAnnotations.map((ann) => (
                  <div
                    key={ann.id}
                    className="rounded-2xl border border-neutral-700 bg-neutral-800/50 p-3 space-y-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <BookMarked className="h-3.5 w-3.5 text-amber-400" />
                      <span className="text-[0.6rem] text-neutral-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(ann.updated_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {(ann as any).typed_text && (
                      <p className="text-xs text-neutral-200 line-clamp-4 leading-relaxed">
                        {(ann as any).typed_text}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {ann.verse_ids.map((vid) => (
                        <span
                          key={vid}
                          className="text-[0.55rem] bg-amber-400/10 text-amber-400 rounded-md px-1.5 py-0.5 font-medium"
                        >
                          {vid}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        ) : (
          <HowToGuide onTryAction={onTryAction} />
        )}
      </SheetContent>
    </Sheet>
  );
}
