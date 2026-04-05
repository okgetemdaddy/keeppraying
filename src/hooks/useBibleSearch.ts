import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { parseBibleReferences, looksLikeReference, type ParsedReference } from "@/lib/bibleReferenceParser";

/* ── Types ── */

export interface SearchResultReference {
  type: "reference";
  label: string;          // "John 3:16"
  bookUsfm: string;
  chapter: number;
  verseStart?: number;
  verseEnd?: number;
}

export interface SearchResultNote {
  type: "note";
  id: string;
  snippet: string;
  bookUsfm: string;
  chapterNumber: number;
  verseNumber: number;
  versionId: number;
}

export interface SearchResultBookmark {
  type: "bookmark";
  id: string;
  bookUsfm: string;
  chapterNumber: number;
  verseNumber: number;
  versionId: number;
}

export interface SearchResultBunch {
  type: "bunch";
  id: string;
  bunchName: string;
  description?: string;
  verseCount: number;
  firstBookUsfm?: string;
  firstChapter?: number;
  firstVerse?: number;
  firstVersionId?: number;
}

export interface SearchResultAI {
  type: "ai";
  label: string;
  bookUsfm: string;
  chapter: number;
  verseStart?: number;
  verseEnd?: number;
  confidence: number;
}

export interface SearchResultSession {
  type: "session";
  id: string;
  title: string;
  entryType: "journal" | "study_session";
  bookUsfm: string;
  chapterNumber: number;
  summaryLine?: string;
  tags?: string[];
  createdAt: string;
}

export type SearchResult =
  | SearchResultReference
  | SearchResultNote
  | SearchResultBookmark
  | SearchResultBunch
  | SearchResultAI
  | SearchResultSession;

/* ── Recent searches (localStorage) ── */

const RECENT_KEY = "bible_recent_searches";
const MAX_RECENT = 8;

export function getRecentSearches(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]").slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

export function addRecentSearch(q: string) {
  const trimmed = q.trim();
  if (!trimmed) return;
  try {
    const existing = getRecentSearches().filter((s) => s !== trimmed);
    existing.unshift(trimmed);
    localStorage.setItem(RECENT_KEY, JSON.stringify(existing.slice(0, MAX_RECENT)));
  } catch {}
}

/* ── The hook ── */

export function useBibleSearch(availableBooks?: string[]) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController>();

  // Debounce the query
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  // ── Instant: local reference parsing ──
  const localResults = useMemo((): SearchResultReference[] => {
    if (!query.trim() || query.trim().length < 2) return [];
    const refs = parseBibleReferences(query, availableBooks);
    return refs.map((r) => ({
      type: "reference" as const,
      label: `${r.bookName} ${r.chapter}${r.verseStart ? `:${r.verseStart}` : ""}${r.verseEnd ? `–${r.verseEnd}` : ""}`,
      bookUsfm: r.bookUsfm,
      chapter: r.chapter,
      verseStart: r.verseStart,
      verseEnd: r.verseEnd,
    }));
  }, [query, availableBooks]);

  // ── DB + AI search (debounced) ──
  const {
    data: remoteResults,
    isLoading: isSearching,
    isFetching,
  } = useQuery<SearchResult[]>({
    queryKey: ["bible-search", debouncedQuery, user?.id ?? "anon"],
    queryFn: async (): Promise<SearchResult[]> => {
      if (!debouncedQuery || debouncedQuery.length < 2) return [];

      // Cancel previous request
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      const results: SearchResult[] = [];

      // ── DB searches (only if logged in) ──
      if (user) {
        const dbPromises: Promise<void>[] = [];

        // Notes search
        dbPromises.push(
          (async () => {
            const { data } = await supabase
              .from("user_notes")
              .select("id, verse_number, note_content, book_usfm, chapter_number, version_id")
              .eq("user_id", user.id)
              .ilike("note_content", `%${debouncedQuery}%`)
              .limit(5);
            (data ?? []).forEach((n: any) => {
              results.push({
                type: "note",
                id: n.id,
                snippet: n.note_content?.slice(0, 80) + (n.note_content?.length > 80 ? "…" : ""),
                bookUsfm: n.book_usfm,
                chapterNumber: n.chapter_number,
                verseNumber: n.verse_number,
                versionId: n.version_id,
              });
            });
          })(),
        );

        // Verse bunches search
        dbPromises.push(
          (async () => {
            const { data } = await supabase
              .from("verse_bunches")
              .select("id, bunch_name, description, verse_count, first_book_usfm, first_chapter, first_verse, first_version_id")
              .eq("user_id", user.id)
              .ilike("bunch_name", `%${debouncedQuery}%`)
              .limit(5);
            (data ?? []).forEach((b: any) => {
              results.push({
                type: "bunch",
                id: b.id,
                bunchName: b.bunch_name,
                description: b.description,
                verseCount: b.verse_count ?? 0,
                firstBookUsfm: b.first_book_usfm,
                firstChapter: b.first_chapter,
                firstVerse: b.first_verse,
                firstVersionId: b.first_version_id,
              });
            });
          })(),
        );

        // Bible Sight entries search — user's own journals
        dbPromises.push(
          (async () => {
            const { data } = await supabase
              .from("bible_sight_entries")
              .select("id, title, book_usfm, chapter_number, summary_line, tags, created_at, entry_type, content")
              .eq("user_id", user.id)
              .eq("entry_type", "journal")
              .ilike("content", `%${debouncedQuery}%`)
              .order("created_at", { ascending: false })
              .limit(5);
            (data ?? []).forEach((s: any) => {
              results.push({
                type: "session",
                id: s.id,
                title: s.title || s.summary_line || `${s.book_usfm} ${s.chapter_number}`,
                entryType: "journal",
                bookUsfm: s.book_usfm,
                chapterNumber: s.chapter_number,
                summaryLine: s.summary_line,
                tags: s.tags,
                createdAt: s.created_at,
              });
            });
          })(),
        );

        await Promise.all(dbPromises);
      }

      // ── Public study sessions (visible to everyone) ──
      try {
        const { data: publicSessions } = await supabase
          .from("bible_sight_entries")
          .select("id, title, book_usfm, chapter_number, summary_line, tags, created_at, entry_type, user_id")
          .eq("entry_type", "study_session")
          .or(`title.ilike.%${debouncedQuery}%,content.ilike.%${debouncedQuery}%`)
          .order("created_at", { ascending: false })
          .limit(5);

        (publicSessions ?? []).forEach((s: any) => {
          // Avoid duplicates if already in user results
          if (!results.find((r) => r.type === "session" && (r as any).id === s.id)) {
            results.push({
              type: "session",
              id: s.id,
              title: s.title || s.summary_line || `${s.book_usfm} ${s.chapter_number}`,
              entryType: "study_session",
              bookUsfm: s.book_usfm,
              chapterNumber: s.chapter_number,
              summaryLine: s.summary_line,
              tags: s.tags,
              createdAt: s.created_at,
            });
          }
        });
      } catch {
        // Non-critical
      }

      // ── AI interpretation (skip if it's clearly a direct reference) ──
      if (!looksLikeReference(debouncedQuery) && debouncedQuery.length >= 4) {
        try {
          const { data, error } = await supabase.functions.invoke("bible-search", {
            body: { query: debouncedQuery },
          });
          if (!error && data?.suggestions) {
            for (const s of data.suggestions) {
              results.push({
                type: "ai",
                label: s.label,
                bookUsfm: s.bookUsfm,
                chapter: s.chapter,
                verseStart: s.verseStart,
                verseEnd: s.verseEnd,
                confidence: s.confidence ?? 0.8,
              });
            }
          }
        } catch {
          // AI failure is non-critical
        }
      }

      return results;
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 60_000,
    retry: false,
  });

  const clearSearch = useCallback(() => {
    setQuery("");
    setDebouncedQuery("");
  }, []);

  return {
    query,
    setQuery,
    localResults,
    remoteResults: remoteResults ?? [],
    isSearching: isFetching,
    clearSearch,
  };
}
