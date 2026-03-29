import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  BookmarkCheck,
  Highlighter,
  StickyNote,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

/* ── Types ── */
interface HighlightRow {
  id: string;
  book_usfm: string;
  chapter_number: number;
  verse_number: number;
  color: string;
  version_id: number;
  created_at: string;
}

interface BookmarkRow {
  id: string;
  book_usfm: string;
  chapter_number: number;
  verse_number: number;
  version_id: number;
  created_at: string;
}

interface NoteRow {
  id: string;
  book_usfm: string;
  chapter_number: number;
  verse_number: number;
  note_content: string;
  version_id: number;
  created_at: string;
  updated_at: string;
}

/* ── Highlight color classes ── */
const HL_DOT: Record<string, string> = {
  yellow: "bg-yellow-400",
  green: "bg-emerald-400",
  blue: "bg-sky-400",
  pink: "bg-pink-400",
  purple: "bg-violet-400",
  orange: "bg-orange-400",
};

/* ── Short book name helper ── */
function bookAbbr(usfm: string): string {
  const map: Record<string, string> = {
    GEN: "Gen", EXO: "Exo", LEV: "Lev", NUM: "Num", DEU: "Deu",
    JOS: "Jos", JDG: "Jdg", RUT: "Rut", "1SA": "1Sa", "2SA": "2Sa",
    "1KI": "1Ki", "2KI": "2Ki", "1CH": "1Ch", "2CH": "2Ch",
    EZR: "Ezr", NEH: "Neh", EST: "Est", JOB: "Job", PSA: "Psa",
    PRO: "Pro", ECC: "Ecc", SNG: "Sng", ISA: "Isa", JER: "Jer",
    LAM: "Lam", EZK: "Ezk", DAN: "Dan", HOS: "Hos", JOL: "Jol",
    AMO: "Amo", OBA: "Oba", JON: "Jon", MIC: "Mic", NAM: "Nam",
    HAB: "Hab", ZEP: "Zep", HAG: "Hag", ZEC: "Zec", MAL: "Mal",
    MAT: "Mat", MRK: "Mrk", LUK: "Luk", JHN: "Jhn", ACT: "Act",
    ROM: "Rom", "1CO": "1Co", "2CO": "2Co", GAL: "Gal", EPH: "Eph",
    PHP: "Php", COL: "Col", "1TH": "1Th", "2TH": "2Th",
    "1TI": "1Ti", "2TI": "2Ti", TIT: "Tit", PHM: "Phm",
    HEB: "Heb", JAS: "Jas", "1PE": "1Pe", "2PE": "2Pe",
    "1JN": "1Jn", "2JN": "2Jn", "3JN": "3Jn", JUD: "Jud", REV: "Rev",
  };
  return map[usfm] ?? usfm;
}

/* ── Data hook ── */
function useBibleAnnotations() {
  const { user } = useAuth();

  const highlights = useQuery<HighlightRow[]>({
    queryKey: ["board", "highlights", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_highlights")
        .select("id, book_usfm, chapter_number, verse_number, color, version_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) return [];
      return (data ?? []) as HighlightRow[];
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  const bookmarks = useQuery<BookmarkRow[]>({
    queryKey: ["board", "bookmarks", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_bookmarks")
        .select("id, book_usfm, chapter_number, verse_number, version_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) return [];
      return (data ?? []) as BookmarkRow[];
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  const notes = useQuery<NoteRow[]>({
    queryKey: ["board", "notes", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_notes")
        .select("id, book_usfm, chapter_number, verse_number, note_content, version_id, created_at, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(50);
      if (error) return [];
      return (data ?? []) as NoteRow[];
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  return { highlights: highlights.data ?? [], bookmarks: bookmarks.data ?? [], notes: notes.data ?? [] };
}

/* ── Section component ── */
export function BoardBibleAnnotations({ textColor }: { textColor: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { highlights, bookmarks, notes } = useBibleAnnotations();
  const [expandedSection, setExpandedSection] = useState<"highlights" | "bookmarks" | "notes" | null>(null);

  if (!user) return null;

  const totalCount = highlights.length + bookmarks.length + notes.length;
  if (totalCount === 0) return null;

  const goToVerse = (versionId: number, bookUsfm: string, chapter: number, verse: number) => {
    navigate(`/bible?v=${versionId}&b=${bookUsfm}&c=${chapter}`);
    setTimeout(() => {
      document.getElementById(`verse-${verse}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 800);
  };

  const sections = [
    {
      key: "highlights" as const,
      icon: <Highlighter className="h-4 w-4" />,
      label: "Highlights",
      count: highlights.length,
      color: "text-yellow-500",
    },
    {
      key: "bookmarks" as const,
      icon: <BookmarkCheck className="h-4 w-4" />,
      label: "Bookmarks",
      count: bookmarks.length,
      color: "text-primary",
    },
    {
      key: "notes" as const,
      icon: <StickyNote className="h-4 w-4" />,
      label: "Notes",
      count: notes.length,
      color: "text-amber-500",
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="mb-8"
    >
      {/* Section header */}
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="h-5 w-5" style={{ color: textColor }} />
        <h2 className="text-base font-display font-semibold" style={{ color: textColor }}>
          Bible Annotations
        </h2>
        <span className="text-xs rounded-full px-2 py-0.5" style={{ color: `${textColor}80`, background: "rgba(255,255,255,0.1)" }}>
          {totalCount}
        </span>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 mb-4">
        {sections
          .filter((s) => s.count > 0)
          .map((s) => (
            <button
              key={s.key}
              onClick={() => setExpandedSection(expandedSection === s.key ? null : s.key)}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all"
              style={{
                background: expandedSection === s.key ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.08)",
                color: expandedSection === s.key ? textColor : `${textColor}70`,
              }}
            >
              <span className={s.color}>{s.icon}</span>
              {s.label}
              <span className="opacity-60">{s.count}</span>
            </button>
          ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {expandedSection === "highlights" && highlights.length > 0 && (
          <motion.div
            key="highlights"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            <ScrollArea className="w-full">
              <div className="flex gap-2 pb-2">
                {highlights.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => goToVerse(h.version_id, h.book_usfm, h.chapter_number, h.verse_number)}
                    className="shrink-0 flex items-center gap-2 rounded-xl px-3 py-2.5 transition-all hover:scale-105"
                    style={{ background: "rgba(255,255,255,0.1)" }}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${HL_DOT[h.color] ?? "bg-yellow-400"}`} />
                    <span className="text-xs font-medium whitespace-nowrap" style={{ color: textColor }}>
                      {bookAbbr(h.book_usfm)} {h.chapter_number}:{h.verse_number}
                    </span>
                    <ChevronRight className="h-3 w-3 opacity-40" style={{ color: textColor }} />
                  </button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </motion.div>
        )}

        {expandedSection === "bookmarks" && bookmarks.length > 0 && (
          <motion.div
            key="bookmarks"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            <ScrollArea className="w-full">
              <div className="flex gap-2 pb-2">
                {bookmarks.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => goToVerse(b.version_id, b.book_usfm, b.chapter_number, b.verse_number)}
                    className="shrink-0 flex items-center gap-2 rounded-xl px-3 py-2.5 transition-all hover:scale-105"
                    style={{ background: "rgba(255,255,255,0.1)" }}
                  >
                    <BookmarkCheck className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-medium whitespace-nowrap" style={{ color: textColor }}>
                      {bookAbbr(b.book_usfm)} {b.chapter_number}:{b.verse_number}
                    </span>
                    <ChevronRight className="h-3 w-3 opacity-40" style={{ color: textColor }} />
                  </button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </motion.div>
        )}

        {expandedSection === "notes" && notes.length > 0 && (
          <motion.div
            key="notes"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {notes.slice(0, 8).map((n) => (
                <button
                  key={n.id}
                  onClick={() => goToVerse(n.version_id, n.book_usfm, n.chapter_number, n.verse_number)}
                  className="text-left rounded-xl px-4 py-3 transition-all hover:scale-[1.02]"
                  style={{ background: "rgba(255,255,255,0.1)" }}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <StickyNote className="h-3 w-3 text-amber-400" />
                    <span className="text-[0.65rem] font-semibold" style={{ color: `${textColor}90` }}>
                      {bookAbbr(n.book_usfm)} {n.chapter_number}:{n.verse_number}
                    </span>
                  </div>
                  <p
                    className="text-xs leading-relaxed line-clamp-2"
                    style={{ color: `${textColor}80` }}
                  >
                    {n.note_content}
                  </p>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
