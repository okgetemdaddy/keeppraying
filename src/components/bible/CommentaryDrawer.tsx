import React, { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, ArrowLeft, BookOpen, Library, Loader2 } from "lucide-react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { renderWithVerseLinks } from "@/lib/renderWithVerseLinks";
import { USFM_BOOK_NAMES } from "@/lib/usfmBooks";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";

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

/* ── Ornamental SVG Dividers (shared with DeepStudyDrawer) ── */
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

interface CommentaryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookUsfm: string;
  chapterNumber: number;
}

export function CommentaryDrawer({
  open,
  onOpenChange,
  bookUsfm,
  chapterNumber,
}: CommentaryDrawerProps) {
  const { user } = useAuth();
  const [selectedHost, setSelectedHost] = useState<typeof COMMENTARY_HOSTS[number] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const bookName = USFM_BOOK_NAMES[bookUsfm] ?? bookUsfm;

  // Fetch commentary chunks for the selected host + current chapter
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
    enabled: !!selectedHost && open,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch available chapter counts per host for this book (to show availability)
  const { data: hostAvailability } = useQuery({
    queryKey: ["commentary-availability", bookUsfm],
    queryFn: async () => {
      const { data } = await supabase
        .from("library_chunks")
        .select("author, chapter_number")
        .eq("bible_book_usfm", bookUsfm)
        .not("author", "is", null);

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
    enabled: open && !selectedHost,
    staleTime: 10 * 60 * 1000,
  });

  // Filter hosts by search
  const filteredHosts = useMemo(() => {
    if (!searchQuery.trim()) return COMMENTARY_HOSTS;
    const q = searchQuery.toLowerCase();
    return COMMENTARY_HOSTS.filter(
      (h) =>
        h.title.toLowerCase().includes(q) ||
        h.author.toLowerCase().includes(q) ||
        h.description.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Filter commentary content by search
  const filteredChunks = useMemo(() => {
    if (!commentaryChunks) return [];
    if (!searchQuery.trim()) return commentaryChunks;
    const q = searchQuery.toLowerCase();
    return commentaryChunks.filter((c: any) =>
      c.content?.toLowerCase().includes(q)
    );
  }, [commentaryChunks, searchQuery]);

  const handleBack = useCallback(() => {
    setSelectedHost(null);
    setSearchQuery("");
  }, []);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    // Reset after animation
    setTimeout(() => {
      setSelectedHost(null);
      setSearchQuery("");
    }, 300);
  }, [onOpenChange]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[80vh] max-h-[80vh] bg-background dark:bg-[#1C1C1E] flex flex-col">
        {/* Header */}
        <div className="shrink-0 px-5 pt-4 pb-3 border-b border-border/50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              {selectedHost ? (
                <button
                  onClick={handleBack}
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
                  {selectedHost ? selectedHost.title : "Commentary Library"}
                </h2>
                <p className="text-[0.6rem] text-muted-foreground">
                  {selectedHost
                    ? `${selectedHost.author} · ${bookName} ${chapterNumber}`
                    : `${bookName} ${chapterNumber} · 6 classical commentaries`}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors shrink-0"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                selectedHost
                  ? `Search ${selectedHost.author}...`
                  : "Search commentaries..."
              }
              className="pl-9 h-9 rounded-xl bg-muted/30 dark:bg-[#2C2C2E] border-border/50 text-sm"
            />
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="px-5 py-4">
            <AnimatePresence mode="wait">
              {!selectedHost ? (
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
                          setSelectedHost(host);
                          setSearchQuery("");
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
                /* ── Reading View: Commentary Content ── */
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
                          className="space-y-3"
                        >
                          <div
                            className="text-sm leading-[1.95] text-foreground/90 dark:text-neutral-200/90 whitespace-pre-line"
                            style={{ fontFamily: "'EB Garamond', 'Georgia', serif" }}
                          >
                            {renderWithVerseLinks(chunk.content)}
                          </div>
                          {idx < filteredChunks.length - 1 && <ScrollOrnament />}
                        </motion.article>
                      ))}

                      <OliveBranchDivider />

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
