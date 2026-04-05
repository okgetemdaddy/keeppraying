import React, { useState, useMemo, useCallback, useRef } from "react";
import { X, Plus, PenTool, Clock, Save, Loader2, Trash2, Sparkles } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HandwritingEngine, type StrokeData, type HandwritingEngineHandle } from "@/components/bible/HandwritingEngine";
import type { Annotation } from "@/hooks/useAnnotations";
import { useJournalGeneration } from "@/hooks/useJournalGeneration";
import { renderWithVerseLinks } from "@/lib/renderWithVerseLinks";

interface Verse {
  number: number;
  text: string;
}

interface JournalPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapterTitle?: string;
  bookUsfm?: string;
  chapterId?: string;
  journalAnnotations: Annotation[];
  onSave: (entry: {
    verseIds: string[];
    strokes: StrokeData[];
    svg?: string;
    typedText?: string;
    existingId?: string;
  }) => void;
  onDelete?: (id: string) => void;
  /** Chapter verses for Bible Sight generation */
  chapterVerses?: Verse[];
  versionId?: number;
}

export function JournalPanel({
  open,
  onOpenChange,
  chapterTitle,
  bookUsfm,
  chapterId,
  journalAnnotations,
  onSave,
  onDelete,
  chapterVerses,
  versionId,
}: JournalPanelProps) {
  const engineRef = useRef<HandwritingEngineHandle>(null);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [typedText, setTypedText] = useState("");
  const [initialStrokes, setInitialStrokes] = useState<StrokeData[]>([]);
  const [dirty, setDirty] = useState(false);
  const [currentStrokes, setCurrentStrokes] = useState<StrokeData[]>([]);

  const chapterNum = chapterId ? parseInt(chapterId, 10) : undefined;

  const { generate, refreshAndUpdate, isGenerating, isRefreshing, lastResult } =
    useJournalGeneration(bookUsfm, chapterNum, chapterTitle, chapterVerses, versionId);

  const journalKey = bookUsfm && chapterId ? `${bookUsfm}.${chapterId}.journal` : null;

  const sortedEntries = useMemo(
    () => [...journalAnnotations].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [journalAnnotations],
  );

  const loadEntry = useCallback((ann: Annotation) => {
    setActiveEntryId(ann.id);
    setInitialStrokes(ann.strokes as StrokeData[]);
    setCurrentStrokes(ann.strokes as StrokeData[]);
    setTypedText((ann as any).typed_text ?? "");
    setDirty(false);
  }, []);

  const startNewEntry = useCallback(() => {
    setActiveEntryId(null);
    setInitialStrokes([]);
    setCurrentStrokes([]);
    setTypedText("");
    setDirty(false);
  }, []);

  const handleStrokesChange = useCallback((strokes: StrokeData[]) => {
    setCurrentStrokes(strokes);
    setDirty(true);
  }, []);

  const handleSave = useCallback(() => {
    if (!journalKey) return;
    const svg = engineRef.current?.getSVG();
    onSave({
      verseIds: [journalKey],
      strokes: currentStrokes,
      svg: svg ?? undefined,
      typedText: typedText || undefined,
      existingId: activeEntryId ?? undefined,
    });
    setDirty(false);
  }, [journalKey, currentStrokes, typedText, activeEntryId, onSave]);

  const handleBibleSight = useCallback(async () => {
    const result = await generate();
    if (result) {
      setTypedText(result.journal_text);
      setDirty(true);
    }
  }, [generate]);

  const handleRefreshAndUpdate = useCallback(async (parentEntryId?: string) => {
    const result = await refreshAndUpdate(parentEntryId);
    if (result) {
      // Auto-save as new entry
      if (journalKey) {
        onSave({
          verseIds: [journalKey],
          strokes: [],
          typedText: result.journal_text,
        });
      }
    }
  }, [refreshAndUpdate, journalKey, onSave]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[85vw] sm:w-[480px] p-0 flex flex-col bg-[#faf6ee] dark:bg-[#1a1814]"
      >
        {/* Header */}
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-amber-200/40 dark:border-amber-800/30 bg-gradient-to-br from-amber-50/80 to-transparent dark:from-amber-900/10">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-left text-base font-bold text-foreground">
              📖 {chapterTitle ?? "Journal"}
            </SheetTitle>
            <div className="flex items-center gap-1.5">
              {dirty && (
                <span className="text-[0.6rem] text-amber-600 dark:text-amber-400 font-medium animate-pulse">
                  unsaved
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSave}
                disabled={!dirty && !!activeEntryId}
                className="h-8 w-8 p-0 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                title="Save"
              >
                <Save className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="text-[0.65rem] text-muted-foreground/70 italic tracking-wide mt-0.5">
            Handwrite or type your reflections on this chapter
          </p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col">
          {/* Drawing canvas */}
          <div className="px-3 pt-3">
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                height: 280,
                boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.15), inset 0 0 60px -20px rgb(180 140 60 / 0.1)",
              }}
            >
              <HandwritingEngine
                ref={engineRef}
                key={activeEntryId ?? "new"}
                height={280}
                variant="journal"
                initialStrokes={initialStrokes}
                onChange={handleStrokesChange}
                showToolbar={true}
                defaultColor="#2c1810"
                defaultSize={6}
              />
            </div>
          </div>

          {/* Typed notes area */}
          <div className="px-4 pt-3 pb-2">
            <label className="text-[0.65rem] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1.5 block">
              Written Notes
            </label>
            <Textarea
              value={typedText}
              onChange={(e) => { setTypedText(e.target.value); setDirty(true); }}
              placeholder="Type your reflections here alongside your handwritten notes…"
              className="min-h-[80px] bg-white/60 dark:bg-white/5 border-amber-200/50 dark:border-amber-800/30 text-foreground placeholder:text-muted-foreground/50 resize-none rounded-xl focus-visible:ring-amber-400/50"
            />
          </div>

          {/* Bible Sight Button — shows when textarea is empty */}
          {!typedText.trim() && chapterVerses?.length ? (
            <div className="px-4 pb-2">
              <Button
                onClick={handleBibleSight}
                disabled={isGenerating}
                className="w-full gap-2 rounded-xl bg-amber-600/10 hover:bg-amber-600/20 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-medium text-sm h-10 transition-all"
                variant="ghost"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Bible Sight is reflecting…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    ✦ Bible Sight
                  </>
                )}
              </Button>
            </div>
          ) : null}

          {/* Entry list */}
          <div className="px-4 pt-2 pb-6 flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[0.65rem] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                Previous Entries ({sortedEntries.length})
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={startNewEntry}
                className="h-7 gap-1 text-xs text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30"
              >
                <Plus className="h-3 w-3" /> New
              </Button>
            </div>

            {sortedEntries.length === 0 ? (
              <div className="text-center py-8">
                <PenTool className="h-8 w-8 mx-auto text-amber-300 dark:text-amber-700 mb-2" />
                <p className="text-sm text-muted-foreground">No journal entries for this chapter yet.</p>
                <p className="text-[0.65rem] text-muted-foreground/60 mt-1">
                  Start writing above to create your first entry
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {sortedEntries.map((entry) => {
                  const isActive = activeEntryId === entry.id;
                  return (
                    <div key={entry.id} className="relative">
                      <button
                        onClick={() => loadEntry(entry)}
                        className={`w-full text-left rounded-xl border transition-all px-3 py-2.5 ${
                          isActive
                            ? "border-amber-400 bg-amber-50/80 dark:bg-amber-900/20 ring-1 ring-amber-400/30"
                            : "border-amber-200/40 dark:border-amber-800/20 bg-white/40 dark:bg-white/5 hover:bg-amber-50/50 dark:hover:bg-amber-900/10"
                        }`}
                      >
                        {/* SVG thumbnail */}
                        {entry.svg && (
                          <div
                            className="w-full h-12 rounded-lg bg-[#faf8f0] dark:bg-[#1e1c16] mb-1.5 overflow-hidden"
                            dangerouslySetInnerHTML={{
                              __html: entry.svg.replace(
                                /^<svg/,
                                '<svg style="width:100%;height:100%;object-fit:contain" preserveAspectRatio="xMidYMid meet"',
                              ),
                            }}
                          />
                        )}
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                          <span className="text-[0.65rem] text-muted-foreground">
                            {formatDate(entry.created_at)}
                          </span>
                        </div>
                        {(entry as any).typed_text && (
                          <p className="text-xs text-foreground/70 line-clamp-2 mt-1 leading-relaxed">
                            {(entry as any).typed_text}
                          </p>
                        )}
                      </button>

                      {/* Action row beneath each entry: refresh & update + delete */}
                      <div className="flex items-center justify-between mt-1 px-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRefreshAndUpdate(entry.id);
                          }}
                          disabled={isRefreshing}
                          className="text-[0.6rem] font-medium text-amber-600/40 dark:text-amber-500/40 hover:text-amber-600/70 dark:hover:text-amber-400/70 transition-colors disabled:opacity-50"
                        >
                          {isRefreshing ? "reflecting…" : "refresh & update"}
                        </button>
                        {onDelete && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(entry.id);
                            }}
                            className="text-red-400/40 hover:text-red-400/70 transition-colors p-0.5"
                            title="Delete entry"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
