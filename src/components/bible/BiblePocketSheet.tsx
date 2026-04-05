import React, { useMemo, useState, useCallback, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BookOpen, PenTool, StickyNote, Clock, Lightbulb, BookMarked, Download, Search, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useJournalGeneration } from "@/hooks/useJournalGeneration";
import type { Annotation } from "@/hooks/useAnnotations";
import type { InkStroke } from "./InkOverlay";
import { HowToGuide } from "./HowToGuide";

type PocketTab = "notes" | "guide" | "journal" | "search";

interface SearchResult {
  id: string;
  source: "bible_sight" | "annotation";
  book_usfm: string;
  chapter_number: number;
  summary_line?: string | null;
  content_preview: string;
  created_at: string;
  tags?: string[];
}

interface Verse {
  number: number;
  text: string;
}

interface BiblePocketSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapterTitle?: string;
  chapterAnnotations: Annotation[];
  inkStrokes: InkStroke[];
  journalAnnotations?: Annotation[];
  onTryAction?: (actionId: string) => void;
  onExportCanvas?: () => void;
  defaultTab?: PocketTab;
  onNavigateToChapter?: (bookUsfm: string, chapter: number) => void;
  chapterVerses?: Verse[];
  versionId?: number;
  bookUsfm?: string;
  chapterId?: string;
  onJournalSave?: (entry: {
    verseIds: string[];
    strokes: any[];
    svg?: string;
    typedText?: string;
    existingId?: string;
  }) => void;
}

/* ---------- Sub-components ---------- */

function NotesTab({
  sortedAnnotations,
  inkCount,
  noteCount,
  totalAnnotations,
  onExportCanvas,
}: {
  sortedAnnotations: Annotation[];
  inkCount: number;
  noteCount: number;
  totalAnnotations: number;
  onExportCanvas?: () => void;
}) {
  return (
    <>
      {/* Export Canvas Button */}
      {(totalAnnotations > 0 || inkCount > 0) && onExportCanvas && (
        <div className="px-4 pb-2">
          <button
            onClick={onExportCanvas}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 py-2.5 text-sm font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export Canvas
          </button>
        </div>
      )}

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
              <p className="text-sm text-neutral-100 font-medium">Your pocket is empty</p>
              <p className="text-[0.65rem] text-neutral-500 mt-1">
                Start writing on the page or add voice notes
              </p>
            </div>
          ) : (
            <>
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
              {sortedAnnotations.map((ann) => (
                <div key={ann.id} className="rounded-2xl border border-neutral-700 bg-neutral-800/50 p-3 space-y-1.5">
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
                      <span key={vid} className="text-[0.55rem] bg-amber-400/10 text-amber-400 rounded-md px-1.5 py-0.5 font-medium">
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
  );
}

function JournalTab({
  sortedJournalAnnotations,
  chapterVerses,
  versionId,
  bookUsfm,
  chapterId,
  chapterTitle,
  onJournalSave,
}: {
  sortedJournalAnnotations: Annotation[];
  chapterVerses?: Verse[];
  versionId?: number;
  bookUsfm?: string;
  chapterId?: string;
  chapterTitle?: string;
  onJournalSave?: (entry: { verseIds: string[]; strokes: any[]; typedText?: string }) => void;
}) {
  const chapterNum = chapterId ? parseInt(chapterId, 10) : undefined;
  const { generate, refreshAndUpdate, isGenerating, isRefreshing } =
    useJournalGeneration(bookUsfm, chapterNum, chapterTitle, chapterVerses, versionId);

  const journalKey = bookUsfm && chapterId ? `${bookUsfm}.${chapterId}.journal` : null;

  const handleBibleSight = useCallback(async () => {
    const result = await generate();
    if (result && journalKey && onJournalSave) {
      onJournalSave({
        verseIds: [journalKey],
        strokes: [],
        typedText: result.journal_text,
      });
    }
  }, [generate, journalKey, onJournalSave]);

  const handleRefresh = useCallback(async (parentId?: string) => {
    const result = await refreshAndUpdate(parentId);
    if (result && journalKey && onJournalSave) {
      onJournalSave({
        verseIds: [journalKey],
        strokes: [],
        typedText: result.journal_text,
      });
    }
  }, [refreshAndUpdate, journalKey, onJournalSave]);

  const hasVerses = (chapterVerses?.length ?? 0) > 0;

  return (
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-3">
        {/* Bible Sight Generation Button */}
        {hasVerses && (
          <div>
            <Button
              onClick={handleBibleSight}
              disabled={isGenerating}
              className="w-full gap-2 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 border border-amber-500/20 font-medium text-sm h-10 transition-all"
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
        )}

        {sortedJournalAnnotations.length === 0 && !hasVerses ? (
          <div className="text-center py-12">
            <BookMarked className="h-10 w-10 mx-auto text-neutral-600 mb-3" />
            <p className="text-sm text-neutral-100 font-medium">No journal entries yet</p>
            <p className="text-[0.65rem] text-neutral-500 mt-1">
              Open the Journal tool to write reflections for this chapter
            </p>
          </div>
        ) : sortedJournalAnnotations.length === 0 ? (
          <div className="text-center py-6">
            <BookMarked className="h-8 w-8 mx-auto text-neutral-600 mb-2" />
            <p className="text-sm text-neutral-300 font-medium">No entries yet</p>
            <p className="text-[0.65rem] text-neutral-500 mt-1">
              Tap ✦ Bible Sight above to generate your first reflection
            </p>
          </div>
        ) : (
          sortedJournalAnnotations.map((ann) => (
            <div key={ann.id} className="relative">
              <div className="rounded-2xl border border-neutral-700 bg-neutral-800/50 p-3 space-y-1.5">
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
                    <span key={vid} className="text-[0.55rem] bg-amber-400/10 text-amber-400 rounded-md px-1.5 py-0.5 font-medium">
                      {vid}
                    </span>
                  ))}
                </div>
              </div>
              {/* Refresh & update link */}
              <div className="mt-1 px-1">
                <button
                  onClick={() => handleRefresh(ann.id)}
                  disabled={isRefreshing}
                  className="text-[0.6rem] font-medium text-amber-600/40 hover:text-amber-600/70 transition-colors disabled:opacity-50"
                >
                  {isRefreshing ? "reflecting…" : "refresh & update"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </ScrollArea>
  );
}

function SearchTab({ onNavigateToChapter }: { onNavigateToChapter?: (bookUsfm: string, chapter: number) => void }) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim() || !user) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const lowerQ = q.toLowerCase();

      // Search bible_sight_entries
      const { data: sightRows } = await supabase
        .from("bible_sight_entries")
        .select("id, book_usfm, chapter_number, content, summary_line, tags, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      const sightResults: SearchResult[] = ((sightRows as any[]) || [])
        .filter(
          (r) =>
            r.content?.toLowerCase().includes(lowerQ) ||
            r.summary_line?.toLowerCase().includes(lowerQ) ||
            r.tags?.some((t: string) => t.includes(lowerQ)) ||
            r.book_usfm?.toLowerCase().includes(lowerQ)
        )
        .map((r) => ({
          id: r.id,
          source: "bible_sight" as const,
          book_usfm: r.book_usfm,
          chapter_number: r.chapter_number,
          summary_line: r.summary_line,
          content_preview: r.content?.slice(0, 120) + "...",
          created_at: r.created_at,
          tags: r.tags,
        }));

      // Search journal annotations
      const { data: annRows } = await supabase
        .from("annotations")
        .select("id, verse_ids, typed_text, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(100);

      const journalResults: SearchResult[] = ((annRows as any[]) || [])
        .filter((a) => a.verse_ids?.some((v: string) => v.endsWith(".journal")))
        .filter((a) => a.typed_text?.toLowerCase().includes(lowerQ))
        .map((a) => {
          const journalVid = a.verse_ids?.find((v: string) => v.endsWith(".journal")) || "";
          const parts = journalVid.split(".");
          return {
            id: a.id,
            source: "annotation" as const,
            book_usfm: parts[0] || "",
            chapter_number: parseInt(parts[1], 10) || 0,
            content_preview: a.typed_text?.slice(0, 120) + "...",
            created_at: a.updated_at,
          };
        });

      setResults([...sightResults, ...journalResults].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ).slice(0, 30));
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setSearching(false);
    }
  }, [user]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => doSearch(query), 400);
    return () => clearTimeout(t);
  }, [query, doSearch]);

  return (
    <div className="flex flex-col flex-1">
      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your journal entries…"
            className="pl-9 bg-neutral-800/50 border-neutral-700 text-neutral-100 placeholder:text-neutral-500 h-9 text-sm rounded-xl"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {searching ? (
            <div className="text-center py-12">
              <Loader2 className="h-6 w-6 mx-auto text-amber-400 animate-spin mb-2" />
              <p className="text-xs text-neutral-500">Searching…</p>
            </div>
          ) : !query.trim() ? (
            <div className="text-center py-12">
              <Search className="h-10 w-10 mx-auto text-neutral-700 mb-3" />
              <p className="text-sm text-neutral-400 font-medium">Search your reflections</p>
              <p className="text-[0.65rem] text-neutral-600 mt-1">
                Find journal entries by topic, verse, or keyword
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-neutral-400">No results for "{query}"</p>
            </div>
          ) : (
            results.map((r) => (
              <button
                key={r.id}
                onClick={() => onNavigateToChapter?.(r.book_usfm, r.chapter_number)}
                className="w-full text-left rounded-2xl border border-neutral-700 bg-neutral-800/50 p-3 space-y-1.5 hover:bg-neutral-700/40 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {r.source === "bible_sight" ? (
                    <span className="text-[0.55rem] text-amber-400 font-medium">✦ Bible Sight</span>
                  ) : (
                    <BookMarked className="h-3 w-3 text-amber-400/60" />
                  )}
                  <span className="text-xs font-semibold text-neutral-100">
                    {r.book_usfm} {r.chapter_number}
                  </span>
                  <span className="text-[0.6rem] text-neutral-500 ml-auto">
                    {new Date(r.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                </div>
                {r.summary_line && (
                  <p className="text-[0.65rem] text-amber-400/70 italic">{r.summary_line}</p>
                )}
                <p className="text-xs text-neutral-300 line-clamp-2 leading-relaxed">
                  {r.content_preview}
                </p>
                {r.tags && r.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {r.tags.slice(0, 4).map((tag) => (
                      <span key={tag} className="text-[0.5rem] bg-amber-400/10 text-amber-400/70 rounded px-1 py-0.5">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

/* ---------- Main Component ---------- */

export function BiblePocketSheet({
  open,
  onOpenChange,
  chapterTitle,
  chapterAnnotations,
  inkStrokes,
  journalAnnotations = [],
  onTryAction,
  onExportCanvas,
  defaultTab,
  onNavigateToChapter,
}: BiblePocketSheetProps) {
  const [activeTab, setActiveTab] = useState<PocketTab>(defaultTab ?? "notes");

  useEffect(() => {
    if (defaultTab) setActiveTab(defaultTab);
  }, [defaultTab]);

  const sortedAnnotations = useMemo(
    () => [...chapterAnnotations].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
    [chapterAnnotations],
  );

  const sortedJournalAnnotations = useMemo(
    () => [...journalAnnotations].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
    [journalAnnotations],
  );

  const inkCount = inkStrokes.length;
  const noteCount = sortedAnnotations.filter((a) => (a as any).typed_text).length;
  const totalAnnotations = sortedAnnotations.length;
  const journalCount = sortedJournalAnnotations.length;

  const tabs = [
    { id: "notes" as const, icon: BookOpen, label: "Notes", badge: totalAnnotations },
    { id: "journal" as const, icon: BookMarked, label: "Journal", badge: journalCount },
    { id: "search" as const, icon: Search, label: "Search", badge: 0 },
    { id: "guide" as const, icon: Lightbulb, label: "Guide", badge: 0 },
  ];

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

        {/* Segmented Control — 4 tabs */}
        <div className="px-4 pt-3 pb-2">
          <div className="flex gap-1 bg-neutral-800/60 p-1 rounded-xl">
            {tabs.map(({ id, icon: Icon, label, badge }) => (
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
          <NotesTab
            sortedAnnotations={sortedAnnotations}
            inkCount={inkCount}
            noteCount={noteCount}
            totalAnnotations={totalAnnotations}
            onExportCanvas={onExportCanvas}
          />
        ) : activeTab === "journal" ? (
          <JournalTab sortedJournalAnnotations={sortedJournalAnnotations} />
        ) : activeTab === "search" ? (
          <SearchTab onNavigateToChapter={onNavigateToChapter} />
        ) : (
          <HowToGuide onTryAction={onTryAction} />
        )}
      </SheetContent>
    </Sheet>
  );
}
