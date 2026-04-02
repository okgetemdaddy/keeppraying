import React, { useCallback, useEffect, useState } from "react";
import { Search, BookOpen, StickyNote, Package, Sparkles, Clock, X } from "lucide-react";
import {
  CommandDialog,
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import {
  useBibleSearch,
  getRecentSearches,
  addRecentSearch,
  type SearchResult,
  type SearchResultReference,
  type SearchResultNote,
  type SearchResultBunch,
  type SearchResultAI,
} from "@/hooks/useBibleSearch";
import { USFM_NAMES } from "@/lib/bibleReferenceParser";

interface BibleSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableBooks?: string[];
  onNavigate: (bookUsfm: string, chapter: number, verse?: number) => void;
}

export function BibleSearchDialog({
  open,
  onOpenChange,
  availableBooks,
  onNavigate,
}: BibleSearchDialogProps) {
  const { query, setQuery, localResults, remoteResults, isSearching, clearSearch } =
    useBibleSearch(availableBooks);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recent searches when dialog opens
  useEffect(() => {
    if (open) {
      setRecentSearches(getRecentSearches());
      clearSearch();
    }
  }, [open, clearSearch]);

  // ── Keyboard shortcut: Cmd/Ctrl + K ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      addRecentSearch(query);
      onOpenChange(false);

      switch (result.type) {
        case "reference":
          onNavigate(result.bookUsfm, result.chapter, result.verseStart);
          break;
        case "note":
          onNavigate(result.bookUsfm, result.chapterNumber, result.verseNumber);
          break;
        case "bunch":
          if (result.firstBookUsfm && result.firstChapter) {
            onNavigate(result.firstBookUsfm, result.firstChapter, result.firstVerse);
          }
          break;
        case "ai":
          onNavigate(result.bookUsfm, result.chapter, result.verseStart);
          break;
      }
    },
    [query, onOpenChange, onNavigate],
  );

  const handleRecentSelect = useCallback(
    (term: string) => {
      setQuery(term);
    },
    [setQuery],
  );

  // Group remote results
  const noteResults = remoteResults.filter((r): r is SearchResultNote => r.type === "note");
  const bunchResults = remoteResults.filter((r): r is SearchResultBunch => r.type === "bunch");
  const aiResults = remoteResults.filter((r): r is SearchResultAI => r.type === "ai");

  const hasQuery = query.trim().length > 0;
  const hasAnyResults =
    localResults.length > 0 || noteResults.length > 0 || bunchResults.length > 0 || aiResults.length > 0;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <Command shouldFilter={false} className="rounded-lg">
        <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
          <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Search verses, topics, notes, bunches..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {hasQuery && (
            <button
              onClick={() => clearSearch()}
              className="ml-1 rounded-full p-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="ml-2 hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>

        <CommandList className="max-h-[60vh] overflow-y-auto">
          {/* ── Empty state ── */}
          {hasQuery && !hasAnyResults && !isSearching && query.trim().length >= 2 && (
            <CommandEmpty className="py-12 text-center">
              <BookOpen className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No results found</p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Try a book name, chapter, or topic like "love" or "faith"
              </p>
            </CommandEmpty>
          )}

          {/* ── Recent searches (when no query) ── */}
          {!hasQuery && recentSearches.length > 0 && (
            <CommandGroup heading="Recent Searches">
              {recentSearches.map((term) => (
                <CommandItem
                  key={term}
                  value={`recent-${term}`}
                  onSelect={() => handleRecentSelect(term)}
                  className="cursor-pointer"
                >
                  <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{term}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* ── Direct References (instant, local) ── */}
          {localResults.length > 0 && (
            <CommandGroup heading="Go to Reference">
              {localResults.map((r) => (
                <CommandItem
                  key={`ref-${r.bookUsfm}-${r.chapter}-${r.verseStart}`}
                  value={`ref-${r.label}`}
                  onSelect={() => handleSelect(r)}
                  className="cursor-pointer"
                >
                  <BookOpen className="mr-2 h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">{r.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* ── Notes ── */}
          {noteResults.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Your Notes">
                {noteResults.map((r) => (
                  <CommandItem
                    key={`note-${r.id}`}
                    value={`note-${r.id}`}
                    onSelect={() => handleSelect(r)}
                    className="cursor-pointer"
                  >
                    <StickyNote className="mr-2 h-4 w-4 text-amber-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{r.snippet}</p>
                      <p className="text-xs text-muted-foreground">
                        {USFM_NAMES[r.bookUsfm] ?? r.bookUsfm} {r.chapterNumber}:{r.verseNumber}
                      </p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {/* ── Verse Bunches ── */}
          {bunchResults.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Verse Bunches">
                {bunchResults.map((r) => (
                  <CommandItem
                    key={`bunch-${r.id}`}
                    value={`bunch-${r.id}`}
                    onSelect={() => handleSelect(r)}
                    className="cursor-pointer"
                  >
                    <Package className="mr-2 h-4 w-4 text-violet-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{r.bunchName}</p>
                      {r.description && (
                        <p className="text-xs text-muted-foreground truncate">{r.description}</p>
                      )}
                    </div>
                    <Badge variant="secondary" className="ml-2 text-[10px]">
                      {r.verseCount} verse{r.verseCount !== 1 ? "s" : ""}
                    </Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {/* ── AI Suggestions ── */}
          {aiResults.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Suggested Verses">
                {aiResults.map((r, i) => (
                  <CommandItem
                    key={`ai-${i}-${r.bookUsfm}-${r.chapter}`}
                    value={`ai-${r.label}`}
                    onSelect={() => handleSelect(r)}
                    className="cursor-pointer"
                  >
                    <Sparkles className="mr-2 h-4 w-4 text-primary/70" />
                    <span className="text-sm">{r.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {/* ── Loading indicator ── */}
          {isSearching && hasQuery && (
            <div className="px-4 py-3 text-center">
              <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Searching…
              </div>
            </div>
          )}
        </CommandList>

        {/* ── Footer hint ── */}
        <div className="border-t border-border px-3 py-2 flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground">
            Try "John 3:16", "love", "what does the Bible say about worry"
          </p>
          <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </div>
      </Command>
    </CommandDialog>
  );
}
