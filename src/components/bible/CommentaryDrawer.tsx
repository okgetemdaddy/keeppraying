import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Search, ArrowLeft, BookOpen, Library, Loader2, Eye, Bookmark,
  BookmarkCheck, Trash2,
} from "lucide-react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { renderWithVerseLinks } from "@/lib/renderWithVerseLinks";
import { USFM_BOOK_NAMES } from "@/lib/usfmBooks";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/* ── 6 Commentary Hosts ── */
const COMMENTARY_HOSTS = [
  {
    id: "matthew-henry",
    title: "Matthew Henry's Complete Commentary",
    author: "Matthew Henry",
    era: "1662–1714",
    description: "Devotional exposition of the entire Bible, beloved for pastoral warmth.",
    accent: "from-amber-600/20 to-amber-800/10",
    borderAccent: "border-amber-500/20",
  },
  {
    id: "barnes",
    title: "Barnes' Notes on the Bible",
    author: "Albert Barnes",
    era: "1798–1870",
    description: "Clear, accessible commentary spanning the whole of Scripture.",
    accent: "from-emerald-600/20 to-emerald-800/10",
    borderAccent: "border-emerald-500/20",
  },
  {
    id: "calvin",
    title: "Calvin's Commentaries",
    author: "John Calvin",
    era: "1509–1564",
    description: "Rigorous Reformed exegesis from the father of Reformed theology.",
    accent: "from-violet-600/20 to-violet-800/10",
    borderAccent: "border-violet-500/20",
  },
  {
    id: "keil-delitzsch",
    title: "Keil & Delitzsch OT Commentary",
    author: "Keil & Delitzsch",
    era: "1807–1890",
    description: "Deeply philological Old Testament commentary in the German tradition.",
    accent: "from-cyan-600/20 to-cyan-800/10",
    borderAccent: "border-cyan-500/20",
  },
  {
    id: "wesley",
    title: "John Wesley's Explanatory Notes",
    author: "John Wesley",
    era: "1703–1791",
    description: "Practical, spirit-filled notes from the founder of Methodism.",
    accent: "from-rose-600/20 to-rose-800/10",
    borderAccent: "border-rose-500/20",
  },
  {
    id: "jfb",
    title: "Jamieson, Fausset & Brown",
    author: "Jamieson, Fausset & Brown",
    era: "1871",
    description: "Comprehensive critical and explanatory commentary on the whole Bible.",
    accent: "from-orange-600/20 to-orange-800/10",
    borderAccent: "border-orange-500/20",
  },
] as const;

/* ── Ornamental Dividers ── */
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

/* ── Types ── */
interface SearchResult {
  id: string;
  content: string;
  author: string;
  book_title: string;
  page_reference: string | null;
  relevance_note: string;
}

interface CommentaryBookmark {
  id: string;
  author: string;
  book_usfm: string;
  chapter_number: number;
  chunk_id: string | null;
  excerpt: string;
  title: string;
  created_at: string;
}

interface CommentaryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookUsfm: string;
  chapterNumber: number;
  onGoDeeper?: (context: { author: string; excerpt: string }) => void;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export function CommentaryDrawer({
  open,
  onOpenChange,
  bookUsfm,
  chapterNumber,
  onGoDeeper,
}: CommentaryDrawerProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedHost, setSelectedHost] = useState<typeof COMMENTARY_HOSTS[number] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [aiSearchQuery, setAiSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [editingBookmarkId, setEditingBookmarkId] = useState<string | null>(null);
  const [contextMenuChunkId, setContextMenuChunkId] = useState<string | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const bookName = USFM_BOOK_NAMES[bookUsfm] ?? bookUsfm;

  /* ── Commentary Chunks Query ── */
  const { data: commentaryChunks, isLoading: isLoadingCommentary } = useQuery({
    queryKey: ["commentary", selectedHost?.author, bookUsfm, chapterNumber],
    queryFn: async () => {
      if (!selectedHost) return [];
      const { data } = await supabase
        .from("library_chunks")
        .select("id, content, page_reference, chapter_number")
        .eq("author", selectedHost.author)
        .eq("bible_book_usfm", bookUsfm)
        .eq("chapter_number", chapterNumber)
        .order("id");
      return data ?? [];
    },
    enabled: !!selectedHost && open && !searchResults,
    staleTime: 5 * 60 * 1000,
  });

  /* ── Host Availability ── */
  const { data: hostAvailability } = useQuery({
    queryKey: ["commentary-availability", bookUsfm],
    queryFn: async () => {
      const { data } = await supabase
        .from("library_chunks")
        .select("author, chapter_number")
        .eq("bible_book_usfm", bookUsfm)
        .not("author", "is", null)
        .limit(1000);
      if (!data) return {};
      const counts: Record<string, Set<number>> = {};
      for (const row of data) {
        if (!row.author) continue;
        if (!counts[row.author]) counts[row.author] = new Set();
        counts[row.author].add(row.chapter_number);
      }
      const result: Record<string, number> = {};
      for (const [author, chapters] of Object.entries(counts)) {
        result[author] = chapters.size;
      }
      return result;
    },
    enabled: open && !selectedHost && !searchResults,
    staleTime: 10 * 60 * 1000,
  });

  /* ── Bookmarks Query ── */
  const { data: bookmarks = [] } = useQuery({
    queryKey: ["commentary-bookmarks", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("commentary_bookmarks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as CommentaryBookmark[];
    },
    enabled: !!user && open,
    staleTime: 2 * 60 * 1000,
  });

  /* ── Bookmark Mutations ── */
  const addBookmark = useMutation({
    mutationFn: async (params: { author: string; excerpt: string; chunkId?: string }) => {
      if (!user) throw new Error("Not authenticated");
      const title = params.excerpt.split(/\s+/).slice(0, 8).join(" ") + "…";
      const { error } = await supabase.from("commentary_bookmarks").insert({
        user_id: user.id,
        author: params.author,
        book_usfm: bookUsfm,
        chapter_number: chapterNumber,
        chunk_id: params.chunkId ?? null,
        excerpt: params.excerpt.slice(0, 500),
        title,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commentary-bookmarks"] });
      toast.success("Passage bookmarked");
      setContextMenuChunkId(null);
    },
  });

  const deleteBookmark = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("commentary_bookmarks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["commentary-bookmarks"] }),
  });

  const updateBookmarkTitle = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { error } = await supabase.from("commentary_bookmarks").update({ title }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commentary-bookmarks"] });
      setEditingBookmarkId(null);
    },
  });

  /* ── AI Search ── */
  const handleAiSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q || isSearching) return;

    setIsSearching(true);
    setAiSearchQuery(q);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const resp = await fetch(`${SUPABASE_URL}/functions/v1/commentary-search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          query: q,
          book_usfm: bookUsfm,
          chapter_number: chapterNumber,
          author_filter: selectedHost?.author ?? undefined,
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error ?? `Search failed (${resp.status})`);
      }

      const data = await resp.json();
      setSearchResults(data.results ?? []);
    } catch (err: any) {
      toast.error(err.message ?? "Commentary search failed");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, isSearching, bookUsfm, chapterNumber, selectedHost]);

  const clearSearch = useCallback(() => {
    setSearchResults(null);
    setAiSearchQuery("");
    setSearchQuery("");
  }, []);

  /* ── Filtered hosts/chunks for basic filter (non-AI) ── */
  const filteredHosts = useMemo(() => {
    if (!searchQuery.trim() || searchResults !== null) return COMMENTARY_HOSTS;
    const q = searchQuery.toLowerCase();
    return COMMENTARY_HOSTS.filter(
      (h) =>
        h.title.toLowerCase().includes(q) ||
        h.author.toLowerCase().includes(q) ||
        h.description.toLowerCase().includes(q)
    );
  }, [searchQuery, searchResults]);

  const filteredChunks = useMemo(() => {
    if (!commentaryChunks) return [];
    if (!searchQuery.trim() || searchResults !== null) return commentaryChunks;
    const q = searchQuery.toLowerCase();
    return commentaryChunks.filter((c: any) => c.content?.toLowerCase().includes(q));
  }, [commentaryChunks, searchQuery, searchResults]);

  const handleBack = useCallback(() => {
    setSelectedHost(null);
    setSearchQuery("");
    setSearchResults(null);
    setContextMenuChunkId(null);
  }, []);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setTimeout(() => {
      setSelectedHost(null);
      setSearchQuery("");
      setSearchResults(null);
      setBookmarksOpen(false);
      setContextMenuChunkId(null);
    }, 300);
  }, [onOpenChange]);

  const handleGoDeeper = useCallback((author: string, excerpt: string) => {
    onGoDeeper?.({ author, excerpt: excerpt.slice(0, 800) });
  }, [onGoDeeper]);

  /* ── Context menu for bookmarking ── */
  const handleChunkContextMenu = useCallback((e: React.MouseEvent, chunkId: string) => {
    e.preventDefault();
    setContextMenuChunkId(contextMenuChunkId === chunkId ? null : chunkId);
  }, [contextMenuChunkId]);

  // Close context menu on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenuChunkId(null);
      }
    };
    if (contextMenuChunkId) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [contextMenuChunkId]);

  /* ── Group bookmarks by date ── */
  const groupedBookmarks = useMemo(() => {
    const groups: Record<string, CommentaryBookmark[]> = {};
    for (const bm of bookmarks) {
      const day = new Date(bm.created_at).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric",
      });
      if (!groups[day]) groups[day] = [];
      groups[day].push(bm);
    }
    return groups;
  }, [bookmarks]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[80vh] max-h-[80vh] bg-background dark:bg-[#1C1C1E] flex flex-col">
        {/* Header */}
        <div className="shrink-0 px-5 pt-4 pb-3 border-b border-border/50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              {selectedHost || searchResults ? (
                <button
                  onClick={searchResults && !selectedHost ? clearSearch : handleBack}
                  className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
                >
                  <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                </button>
              ) : (
                <Library className="h-4 w-4 text-amber-500" />
              )}
              <div className="min-w-0">
                <h2
                  className="text-sm font-bold text-foreground truncate"
                  style={{ fontFamily: "'EB Garamond', 'Georgia', serif" }}
                >
                  {searchResults
                    ? `Results for "${aiSearchQuery}"`
                    : selectedHost
                    ? selectedHost.title
                    : "Commentary Library"}
                </h2>
                <p className="text-[0.6rem] text-muted-foreground">
                  {searchResults
                    ? `${searchResults.length} results · powered by GPT-5`
                    : selectedHost
                    ? `${selectedHost.author} · ${bookName} ${chapterNumber}`
                    : `${bookName} ${chapterNumber} · 6 classical commentaries`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {user && (
                <button
                  onClick={() => setBookmarksOpen(!bookmarksOpen)}
                  className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${
                    bookmarksOpen ? "bg-amber-500/20 text-amber-500" : "hover:bg-muted text-muted-foreground"
                  }`}
                >
                  {bookmarksOpen ? (
                    <BookmarkCheck className="h-4 w-4" />
                  ) : (
                    <Bookmark className="h-4 w-4" />
                  )}
                </button>
              )}
              <button
                onClick={handleClose}
                className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Search bar */}
          {!bookmarksOpen && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAiSearch();
              }}
              className="relative"
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  selectedHost
                    ? `Search ${selectedHost.author}...`
                    : "What does Calvin say about grace?"
                }
                className="pl-9 pr-20 h-9 rounded-xl bg-muted/30 dark:bg-[#2C2C2E] border-border/50 text-sm"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {searchResults && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="text-[0.6rem] text-muted-foreground hover:text-foreground px-1.5"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!searchQuery.trim() || isSearching}
                  className="h-6 px-2 rounded-lg bg-amber-500/20 text-amber-500 text-[0.6rem] font-medium disabled:opacity-40 hover:bg-amber-500/30 transition-colors"
                >
                  {isSearching ? <Loader2 className="h-3 w-3 animate-spin" /> : "Search"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Content Area */}
        <div className="flex flex-1 min-h-0">
          {/* Main content */}
          <ScrollArea className={`flex-1 ${bookmarksOpen ? "border-r border-border/30" : ""}`}>
            <div className="px-5 py-4">
              <AnimatePresence mode="wait">
                {/* ── AI Search Results ── */}
                {searchResults && !selectedHost ? (
                  <motion.div
                    key="search-results"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-3"
                  >
                    {isSearching ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="rounded-2xl border border-amber-500/10 p-4 space-y-2">
                          <Skeleton className="h-3 w-24 bg-amber-500/10" />
                          <Skeleton className="h-12 w-full bg-amber-500/5" />
                          <Skeleton className="h-3 w-48 bg-amber-500/5" />
                        </div>
                      ))
                    ) : searchResults.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 space-y-3 text-center">
                        <Search className="h-10 w-10 text-muted-foreground/40" />
                        <p className="text-sm text-foreground font-medium">No results found</p>
                        <p className="text-[0.65rem] text-muted-foreground max-w-xs">
                          Try rephrasing your search or broadening the scope.
                        </p>
                      </div>
                    ) : (
                      searchResults.map((result, idx) => (
                        <motion.div
                          key={result.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="rounded-2xl border border-amber-500/15 bg-gradient-to-br from-amber-600/5 to-transparent p-4 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className="text-xs font-bold text-foreground"
                              style={{ fontFamily: "'EB Garamond', 'Georgia', serif" }}
                            >
                              {result.author}
                            </span>
                            <span className="text-[0.55rem] text-muted-foreground/60">
                              {result.book_title}
                            </span>
                          </div>
                          <div
                            className="text-sm leading-relaxed text-foreground/85 line-clamp-4"
                            style={{ fontFamily: "'EB Garamond', 'Georgia', serif" }}
                          >
                            {renderWithVerseLinks(result.content.slice(0, 400))}
                          </div>
                          <p className="text-[0.6rem] text-amber-500/80 italic">
                            {result.relevance_note}
                          </p>
                          <div className="flex items-center gap-2 pt-1">
                            {onGoDeeper && (
                              <button
                                onClick={() => handleGoDeeper(result.author, result.content)}
                                className="flex items-center gap-1.5 text-[0.6rem] font-medium text-amber-500 hover:text-amber-400 transition-colors"
                              >
                                <Eye className="h-3 w-3" />
                                Go Deeper
                              </button>
                            )}
                            {user && (
                              <button
                                onClick={() => addBookmark.mutate({
                                  author: result.author,
                                  excerpt: result.content,
                                  chunkId: result.id,
                                })}
                                className="flex items-center gap-1 text-[0.6rem] text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <Bookmark className="h-3 w-3" />
                                Bookmark
                              </button>
                            )}
                          </div>
                        </motion.div>
                      ))
                    )}
                  </motion.div>
                ) : !selectedHost ? (
                  /* ── Landing: Commentary Host Cards ── */
                  <motion.div
                    key="hosts"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="grid grid-cols-2 gap-3"
                  >
                    {filteredHosts.map((host, idx) => {
                      const chapCount = hostAvailability?.[host.author] ?? 0;
                      return (
                        <motion.button
                          key={host.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.06 }}
                          onClick={() => {
                            if (navigator.vibrate) navigator.vibrate(8);
                            setSelectedHost(host);
                            setSearchQuery("");
                            setSearchResults(null);
                          }}
                          className={`text-left rounded-2xl border ${host.borderAccent} bg-gradient-to-br ${host.accent} p-4 space-y-2 hover:scale-[1.02] transition-transform active:scale-[0.98]`}
                        >
                          <BookOpen className="h-5 w-5 text-amber-500/70" />
                          <h3
                            className="text-sm font-bold text-foreground leading-tight"
                            style={{ fontFamily: "'EB Garamond', 'Georgia', serif" }}
                          >
                            {host.author}
                          </h3>
                          <p className="text-[0.6rem] text-muted-foreground leading-relaxed">
                            {host.description}
                          </p>
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[0.55rem] text-muted-foreground/60 italic">
                              {host.era}
                            </span>
                            {chapCount > 0 && (
                              <span className="text-[0.55rem] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded-full">
                                {chapCount} ch.
                              </span>
                            )}
                          </div>
                        </motion.button>
                      );
                    })}
                  </motion.div>
                ) : (
                  /* ── Reading View ── */
                  <motion.div
                    key="reading"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >
                    {isLoadingCommentary ? (
                      <div className="flex flex-col items-center justify-center py-16 space-y-3">
                        <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                        <p className="text-sm text-muted-foreground italic">
                          Loading {selectedHost.author}...
                        </p>
                      </div>
                    ) : filteredChunks.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 space-y-3 text-center">
                        <BookOpen className="h-10 w-10 text-muted-foreground/40" />
                        <p className="text-sm text-foreground font-medium">
                          No commentary available yet
                        </p>
                        <p className="text-[0.65rem] text-muted-foreground max-w-xs">
                          {selectedHost.author}'s commentary for {bookName} {chapterNumber} hasn't been ingested yet. Check back soon.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Author header card */}
                        <div className={`rounded-2xl border ${selectedHost.borderAccent} bg-gradient-to-br ${selectedHost.accent} p-5`}>
                          <h3
                            className="text-lg font-bold text-foreground"
                            style={{ fontFamily: "'EB Garamond', 'Georgia', serif" }}
                          >
                            {selectedHost.title}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            {selectedHost.author} · {selectedHost.era}
                          </p>
                          <p className="text-xs text-muted-foreground/80 mt-2 italic">
                            {bookName} {chapterNumber}
                          </p>
                        </div>

                        <OliveBranchDivider />

                        {/* Commentary body */}
                        {filteredChunks.map((chunk: any, idx: number) => (
                          <motion.article
                            key={chunk.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.04 }}
                            className="space-y-3 relative group"
                            onContextMenu={(e) => handleChunkContextMenu(e, chunk.id)}
                          >
                            <div
                              className="text-sm leading-[1.95] text-foreground/90 dark:text-neutral-200/90 whitespace-pre-line"
                              style={{ fontFamily: "'EB Garamond', 'Georgia', serif" }}
                            >
                              {renderWithVerseLinks(chunk.content)}
                            </div>

                            {/* Bookmark/GoDeeper floating actions on hover */}
                            <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                              {onGoDeeper && (
                                <button
                                  onClick={() => handleGoDeeper(selectedHost.author, chunk.content)}
                                  className="h-7 px-2 rounded-lg bg-amber-500/10 text-amber-500 text-[0.6rem] font-medium hover:bg-amber-500/20 transition-colors flex items-center gap-1"
                                >
                                  <Eye className="h-3 w-3" />
                                  Go Deeper
                                </button>
                              )}
                              {user && (
                                <button
                                  onClick={() => addBookmark.mutate({
                                    author: selectedHost.author,
                                    excerpt: chunk.content,
                                    chunkId: chunk.id,
                                  })}
                                  className="h-7 w-7 rounded-lg bg-muted/50 text-muted-foreground hover:text-amber-500 transition-colors flex items-center justify-center"
                                >
                                  <Bookmark className="h-3 w-3" />
                                </button>
                              )}
                            </div>

                            {/* Context menu */}
                            {contextMenuChunkId === chunk.id && (
                              <div
                                ref={contextMenuRef}
                                className="absolute top-8 right-0 z-50 bg-background border border-border rounded-xl shadow-lg p-1 min-w-[160px]"
                              >
                                <button
                                  onClick={() => addBookmark.mutate({
                                    author: selectedHost.author,
                                    excerpt: chunk.content,
                                    chunkId: chunk.id,
                                  })}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-muted rounded-lg transition-colors"
                                >
                                  <Bookmark className="h-3 w-3 text-amber-500" />
                                  Bookmark this passage
                                </button>
                                {onGoDeeper && (
                                  <button
                                    onClick={() => {
                                      setContextMenuChunkId(null);
                                      handleGoDeeper(selectedHost.author, chunk.content);
                                    }}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-muted rounded-lg transition-colors"
                                  >
                                    <Eye className="h-3 w-3 text-amber-500" />
                                    Go Deeper with Bible Sight
                                  </button>
                                )}
                              </div>
                            )}

                            {idx < filteredChunks.length - 1 && <ScrollOrnament />}
                          </motion.article>
                        ))}

                        <OliveBranchDivider />

                        {/* Go Deeper CTA */}
                        {onGoDeeper && filteredChunks.length > 0 && (
                          <div className="flex justify-center py-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleGoDeeper(
                                  selectedHost.author,
                                  filteredChunks[0]?.content?.slice(0, 400) ?? ""
                                )
                              }
                              className="rounded-full border-amber-500/30 text-amber-500 hover:bg-amber-500/10 gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              Go Deeper with Bible Sight
                            </Button>
                          </div>
                        )}

                        {/* Footer attribution */}
                        <div className="text-center py-4">
                          <p className="text-[0.6rem] text-muted-foreground/60 italic">
                            {selectedHost.title} — Public Domain
                          </p>
                          <p className="text-[0.55rem] text-muted-foreground/40 mt-1">
                            KeepRead.ing Commentary Library
                          </p>
                        </div>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </ScrollArea>

          {/* ── Bookmarks Side Panel ── */}
          <AnimatePresence>
            {bookmarksOpen && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 260, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="shrink-0 overflow-hidden"
              >
                <ScrollArea className="h-full">
                  <div className="p-3 space-y-3">
                    <h3
                      className="text-xs font-bold text-foreground flex items-center gap-1.5"
                      style={{ fontFamily: "'EB Garamond', 'Georgia', serif" }}
                    >
                      <BookmarkCheck className="h-3.5 w-3.5 text-amber-500" />
                      Bookmarks ({bookmarks.length})
                    </h3>

                    {bookmarks.length === 0 ? (
                      <p className="text-[0.6rem] text-muted-foreground italic py-4 text-center">
                        Right-click or long-press any passage to bookmark it.
                      </p>
                    ) : (
                      Object.entries(groupedBookmarks).map(([day, bms]) => (
                        <div key={day} className="space-y-1.5">
                          <p className="text-[0.55rem] text-muted-foreground/50 font-medium uppercase tracking-wider">
                            {day}
                          </p>
                          {bms.map((bm) => (
                            <div
                              key={bm.id}
                              className="rounded-xl bg-muted/30 p-2.5 space-y-1 group/bm hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-1">
                                {editingBookmarkId === bm.id ? (
                                  <input
                                    autoFocus
                                    defaultValue={bm.title}
                                    className="text-[0.65rem] font-medium text-foreground bg-transparent border-b border-amber-500/40 outline-none flex-1 min-w-0"
                                    onBlur={(e) =>
                                      updateBookmarkTitle.mutate({
                                        id: bm.id,
                                        title: e.target.value.trim() || bm.title,
                                      })
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                                    }}
                                  />
                                ) : (
                                  <button
                                    className="text-[0.65rem] font-medium text-foreground text-left truncate flex-1 min-w-0"
                                    onContextMenu={(e) => {
                                      e.preventDefault();
                                      setEditingBookmarkId(bm.id);
                                    }}
                                    onDoubleClick={() => setEditingBookmarkId(bm.id)}
                                  >
                                    {bm.title}
                                  </button>
                                )}
                                <button
                                  onClick={() => deleteBookmark.mutate(bm.id)}
                                  className="opacity-0 group-hover/bm:opacity-100 h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-destructive transition-all shrink-0"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                              <p className="text-[0.55rem] text-muted-foreground line-clamp-2">
                                {bm.excerpt.slice(0, 120)}
                              </p>
                              <p className="text-[0.5rem] text-muted-foreground/40">
                                {bm.author} · {USFM_BOOK_NAMES[bm.book_usfm] ?? bm.book_usfm} {bm.chapter_number} ·{" "}
                                {new Date(bm.created_at).toLocaleTimeString("en-US", {
                                  hour: "numeric", minute: "2-digit",
                                })}
                              </p>
                            </div>
                          ))}
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer watermark */}
        <div className="shrink-0 border-t border-border/50 px-5 py-2.5 flex items-center justify-center">
          <p className="text-[0.55rem] text-muted-foreground/60 italic tracking-wide">
            Commentary Library · KeepRead.ing — I do this for HIS glory
          </p>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
