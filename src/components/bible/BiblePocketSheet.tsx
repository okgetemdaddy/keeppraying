import React, { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, PenTool, StickyNote, Clock, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Annotation } from "@/hooks/useAnnotations";
import type { InkStroke } from "./InkOverlay";
import { HowToGuide } from "./HowToGuide";

type PocketTab = "notes" | "guide";

interface BiblePocketSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapterTitle?: string;
  chapterAnnotations: Annotation[];
  inkStrokes: InkStroke[];
  onTryAction?: (actionId: string) => void;
}

export function BiblePocketSheet({
  open,
  onOpenChange,
  chapterTitle,
  chapterAnnotations,
  inkStrokes,
  onTryAction,
}: BiblePocketSheetProps) {
  const [activeTab, setActiveTab] = useState<PocketTab>("notes");

  const sortedAnnotations = useMemo(
    () =>
      [...chapterAnnotations].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      ),
    [chapterAnnotations],
  );

  const inkCount = inkStrokes.length;
  const noteCount = sortedAnnotations.filter((a) => (a as any).typed_text).length;
  const totalAnnotations = sortedAnnotations.length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[85vw] sm:w-[420px] p-0 flex flex-col bg-card/98 backdrop-blur-xl"
      >
        {/* Header */}
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/50">
          <SheetTitle className="text-left text-base font-bold text-foreground flex items-center gap-2">
            <BookOpen className="h-4.5 w-4.5 text-primary" />
            Bible Pocket
          </SheetTitle>
          {chapterTitle && (
            <p className="text-[0.65rem] text-muted-foreground mt-0.5">{chapterTitle}</p>
          )}
        </SheetHeader>

        {/* Segmented Control */}
        <div className="px-4 pt-3 pb-2">
          <div className="flex gap-1 bg-muted/50 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("notes")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all",
                activeTab === "notes"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground/70",
              )}
            >
              <BookOpen className="h-3.5 w-3.5" />
              Notes
            </button>
            <button
              onClick={() => setActiveTab("guide")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all",
                activeTab === "guide"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground/70",
              )}
            >
              <Lightbulb className="h-3.5 w-3.5" />
              Guide
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "notes" ? (
          <>
            {/* Stats strip */}
            <div className="flex items-center gap-4 px-5 py-2.5 border-b border-border/30 bg-muted/20">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <PenTool className="h-3.5 w-3.5" />
                <span>{inkCount} strokes</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <StickyNote className="h-3.5 w-3.5" />
                <span>{noteCount} notes</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <BookOpen className="h-3.5 w-3.5" />
                <span>{totalAnnotations} total</span>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-3">
                {sortedAnnotations.length === 0 && inkCount === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/25 mb-3" />
                    <p className="text-sm text-muted-foreground font-medium">
                      Your pocket is empty
                    </p>
                    <p className="text-[0.65rem] text-muted-foreground/60 mt-1">
                      Start writing on the page or add voice notes
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Ink summary */}
                    {inkCount > 0 && (
                      <div className="rounded-2xl border border-border/50 bg-muted/20 p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <PenTool className="h-3.5 w-3.5 text-primary" />
                          <span className="text-xs font-semibold text-foreground">Page Ink</span>
                        </div>
                        <p className="text-[0.65rem] text-muted-foreground">
                          {inkCount} stroke{inkCount !== 1 ? "s" : ""} on this chapter
                        </p>
                      </div>
                    )}

                    {/* Annotations list */}
                    {sortedAnnotations.map((ann) => (
                      <div
                        key={ann.id}
                        className="rounded-2xl border border-border/40 bg-background/60 p-3 space-y-1.5"
                      >
                        <div className="flex items-center gap-2">
                          {(ann as any).typed_text ? (
                            <StickyNote className="h-3.5 w-3.5 text-amber-500" />
                          ) : (
                            <PenTool className="h-3.5 w-3.5 text-primary/60" />
                          )}
                          <span className="text-[0.6rem] text-muted-foreground flex items-center gap-1">
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
                          <p className="text-xs text-foreground/80 line-clamp-3 leading-relaxed">
                            {(ann as any).typed_text}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1">
                          {ann.verse_ids.map((vid) => (
                            <span
                              key={vid}
                              className="text-[0.55rem] bg-primary/10 text-primary rounded-md px-1.5 py-0.5 font-medium"
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
        ) : (
          <HowToGuide onTryAction={onTryAction} />
        )}
      </SheetContent>
    </Sheet>
  );
}
