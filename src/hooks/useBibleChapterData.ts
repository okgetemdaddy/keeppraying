import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { NormalisedVerse } from "@/hooks/useBibleReader";

/* ── Types for user interaction data ── */

export interface UserHighlight {
  id: string;
  verse_number: number;
  color: string;
  reference_normalized: { start?: number; end?: number };
  created_at: string;
}

export interface UserNote {
  id: string;
  verse_number: number;
  note_content: string;
  created_at: string;
  updated_at: string;
}

export interface UserBookmark {
  id: string;
  verse_number: number;
  created_at: string;
}

export interface VerseBunchItemWithName {
  id: string;
  bunch_id: string;
  bunch_name: string;
  verse_number: number;
}

export interface BibleChapterData {
  verses: NormalisedVerse[];
  highlights: UserHighlight[];
  notes: UserNote[];
  bookmarks: UserBookmark[];
  bunchItems: VerseBunchItemWithName[];
}

/* ── Low-level proxy caller (duplicated to keep this module self-contained) ── */

async function fetchBible<T = unknown>(endpoint: string): Promise<T> {
  const { data, error } = await supabase.functions.invoke("youversion-proxy", {
    body: { endpoint },
  });
  if (error) throw new Error(error.message ?? "Failed to fetch Bible data");
  return data as T;
}

interface PassageResponse {
  content: string;
  id: string;
  reference: string;
}

/* ── The concurrent hydration hook ── */

export function useBibleChapterData(
  versionId: number | undefined,
  bookUsfm: string | undefined,
  chapterNumber: string | undefined, // e.g. "1"
  verseIds: string[] | undefined,    // e.g. ["GEN.1.1", "GEN.1.2", ...]
  crossTranslation: boolean = false, // when true, annotations show across all versions
) {
  const { user } = useAuth();

  return useQuery<BibleChapterData>({
    queryKey: [
      "bible",
      "chapterData",
      versionId,
      bookUsfm,
      chapterNumber,
      user?.id ?? "anon",
      crossTranslation ? "cross" : "single",
    ],
    queryFn: async (): Promise<BibleChapterData> => {
      if (!versionId || !bookUsfm || !chapterNumber) {
        return { verses: [], highlights: [], notes: [], bookmarks: [], bunchItems: [] };
      }

      const chapterNum = parseInt(chapterNumber, 10);

      // ── Fetch A: Chapter verses from YouVersion proxy ──
      const fetchVerses = async (): Promise<NormalisedVerse[]> => {
        if (!verseIds?.length) return [];
        const results = await Promise.all(
          verseIds.map(async (passageId) => {
            const res = await fetchBible<PassageResponse>(
              `/bibles/${versionId}/passages/${passageId}?content_type=json`,
            );
            const parts = passageId.split(".");
            const num = parseInt(parts[parts.length - 1], 10);
            return { number: num, text: res.content };
          }),
        );
        return results.sort((a, b) => a.number - b.number);
      };

      // ── Fetch B: User highlights ──
      const fetchHighlights = async (): Promise<UserHighlight[]> => {
        if (!user) return [];
        const { data, error } = await supabase
          .from("user_highlights")
          .select("id, verse_number, color, reference_normalized, created_at")
          .eq("user_id", user.id)
          .eq("version_id", versionId)
          .eq("book_usfm", bookUsfm)
          .eq("chapter_number", chapterNum);
        if (error) {
          console.warn("Failed to fetch highlights:", error.message);
          return [];
        }
        return (data ?? []) as UserHighlight[];
      };

      // ── Fetch C: User notes ──
      const fetchNotes = async (): Promise<UserNote[]> => {
        if (!user) return [];
        const { data, error } = await supabase
          .from("user_notes")
          .select("id, verse_number, note_content, created_at, updated_at")
          .eq("user_id", user.id)
          .eq("version_id", versionId)
          .eq("book_usfm", bookUsfm)
          .eq("chapter_number", chapterNum);
        if (error) {
          console.warn("Failed to fetch notes:", error.message);
          return [];
        }
        return (data ?? []) as UserNote[];
      };

      // ── Fetch D: User bookmarks ──
      const fetchBookmarks = async (): Promise<UserBookmark[]> => {
        if (!user) return [];
        const { data, error } = await supabase
          .from("user_bookmarks")
          .select("id, verse_number, created_at")
          .eq("user_id", user.id)
          .eq("version_id", versionId)
          .eq("book_usfm", bookUsfm)
          .eq("chapter_number", chapterNum);
        if (error) {
          console.warn("Failed to fetch bookmarks:", error.message);
          return [];
        }
        return (data ?? []) as UserBookmark[];
      };

      // ── Fetch E: Verse bunch items for this chapter ──
      const fetchBunchItems = async (): Promise<VerseBunchItemWithName[]> => {
        if (!user) return [];
        const { data, error } = await supabase
          .from("verse_bunch_items")
          .select("id, bunch_id, verse_number, verse_bunches!inner(bunch_name)")
          .eq("user_id", user.id)
          .eq("version_id", versionId)
          .eq("book_usfm", bookUsfm)
          .eq("chapter_number", chapterNum);
        if (error) {
          console.warn("Failed to fetch bunch items:", error.message);
          return [];
        }
        return (data ?? []).map((item: any) => ({
          id: item.id,
          bunch_id: item.bunch_id,
          bunch_name: item.verse_bunches?.bunch_name ?? "Unnamed",
          verse_number: item.verse_number,
        }));
      };

      // ── Fire all five concurrently ──
      const [verses, highlights, notes, bookmarks, bunchItems] = await Promise.all([
        fetchVerses(),
        fetchHighlights(),
        fetchNotes(),
        fetchBookmarks(),
        fetchBunchItems(),
      ]);

      return { verses, highlights, notes, bookmarks, bunchItems };
    },
    enabled: !!versionId && !!bookUsfm && !!chapterNumber,
    staleTime: 5 * 60 * 1000, // User data can change — 5 min stale
  });
}
