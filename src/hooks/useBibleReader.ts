import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/* ── Low-level proxy caller ── */

async function fetchBible<T = unknown>(endpoint: string): Promise<T> {
  const { data, error } = await supabase.functions.invoke("youversion-proxy", {
    body: { endpoint },
  });

  if (error) throw new Error(error.message ?? "Failed to fetch Bible data");
  return data as T;
}

/* ── Types (from actual YouVersion API responses) ── */

export interface BibleVersion {
  id: number;
  abbreviation: string;
  localized_abbreviation: string;
  title: string;
  localized_title: string;
  language_tag: string;
  books: string[]; // USFM book codes available in this version
}

export interface BibleChapterMeta {
  id: string;        // "1"
  passage_id: string; // "GEN.1"
  title: string;     // "1"
  verses: { id: string; passage_id: string; title: string }[];
}

export interface BibleBookMeta {
  abbreviation: string; // "Gen."
  canon: string;        // "old_testament" | "new_testament"
  chapters: BibleChapterMeta[];
  human_long: string;   // "Genesis"
  usfm: string;         // "GEN"
}

export interface BibleIndex {
  books: BibleBookMeta[];
}

export interface PassageResponse {
  content: string;
  id: string;        // e.g. "GEN.1" or "GEN.1.1"
  reference: string; // e.g. "Genesis 1" or "Genesis 1:1"
}

/* ── Normalised verse for the UI ── */

export interface NormalisedVerse {
  number: number;
  text: string;
}

/* ── React Query hooks ── */

/** Fetch all available Bible versions (English) */
export function useBibleVersions() {
  return useQuery<BibleVersion[]>({
    queryKey: ["bible", "versions"],
    queryFn: async () => {
      const res = await fetchBible<{ data: BibleVersion[] }>(
        "/bibles?language_ranges[]=en",
      );
      return res.data;
    },
    staleTime: Infinity,
  });
}

/** Fetch the index (books & chapters) for a specific Bible version */
export function useBibleIndex(bibleId: number | undefined) {
  return useQuery<BibleIndex>({
    queryKey: ["bible", "index", bibleId],
    queryFn: () => fetchBible<BibleIndex>(`/bibles/${bibleId}/index`),
    enabled: !!bibleId,
    staleTime: Infinity,
  });
}

/** Fetch a full chapter as plain text */
export function useBibleChapter(
  bibleId: number | undefined,
  passageId: string | undefined, // e.g. "GEN.1"
) {
  return useQuery<PassageResponse>({
    queryKey: ["bible", "chapter", bibleId, passageId],
    queryFn: () =>
      fetchBible<PassageResponse>(
        `/bibles/${bibleId}/passages/${passageId}?content_type=json`,
      ),
    enabled: !!bibleId && !!passageId,
    staleTime: Infinity,
  });
}

/**
 * Fetch all individual verses for a chapter.
 * Uses the index to know how many verses, then fetches
 * each verse. Results are cached per-verse in bible_cache.
 */
export function useBibleChapterVerses(
  bibleId: number | undefined,
  bookUsfm: string | undefined,
  chapterNumber: string | undefined,
  verseIds: string[] | undefined, // e.g. ["GEN.1.1", "GEN.1.2", ...]
) {
  return useQuery<NormalisedVerse[]>({
    queryKey: ["bible", "verses", bibleId, bookUsfm, chapterNumber],
    queryFn: async () => {
      if (!bibleId || !verseIds?.length) return [];

      // Fetch all verses in parallel
      const results = await Promise.all(
        verseIds.map(async (passageId) => {
          const res = await fetchBible<PassageResponse>(
            `/bibles/${bibleId}/passages/${passageId}?content_type=json`,
          );
          // Extract verse number from passage_id like "GEN.1.3" → 3
          const parts = passageId.split(".");
          const num = parseInt(parts[parts.length - 1], 10);
          return { number: num, text: res.content };
        }),
      );

      return results.sort((a, b) => a.number - b.number);
    },
    enabled: !!bibleId && !!verseIds?.length,
    staleTime: Infinity,
  });
}
