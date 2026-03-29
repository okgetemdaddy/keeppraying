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

/* ── Types (derived from YouVersion API docs) ── */

export interface BibleVersion {
  id: number;
  abbreviation: string;
  local_abbreviation: string;
  title: string;
  local_title: string;
  language_tag: string;
  text_direction: string;
}

export interface BibleBook {
  usfm: string;           // e.g. "GEN"
  human: string;           // e.g. "Genesis"
  chapters: { usfm: string; human: string }[];
}

export interface BibleIndex {
  id: number;
  abbreviation: string;
  title: string;
  text_direction: string;
  books: BibleBook[];
}

export interface PassageContent {
  passages: {
    usfm: string[];
    content: Array<{
      type: string;
      content?: Array<{
        type: string;
        attrs?: { number?: string };
        content?: Array<{
          type: string;
          text?: string;
          attrs?: { verseNumber?: string; number?: string };
        }>;
      }>;
    }>;
  }[];
  reference: {
    human: string;
    usfm: string;
  };
}

/* ── Verse structure we normalise to ── */

export interface NormalisedVerse {
  number: number;
  text: string;
}

/**
 * Flatten the YouVersion JSON passage response into simple verse objects.
 * The API returns a nested content tree — we walk it to extract verse numbers + text.
 */
export function normalisePassage(raw: PassageContent): NormalisedVerse[] {
  const verses: NormalisedVerse[] = [];
  let currentVerse = 0;
  let currentText = "";

  function flush() {
    if (currentVerse > 0 && currentText.trim()) {
      verses.push({ number: currentVerse, text: currentText.trim() });
      currentText = "";
    }
  }

  for (const passage of raw.passages ?? []) {
    for (const block of passage.content ?? []) {
      for (const node of block.content ?? []) {
        if (node.content) {
          for (const leaf of node.content) {
            const verseNum =
              leaf.attrs?.verseNumber ?? leaf.attrs?.number;
            if (verseNum && leaf.type === "verse_number") {
              flush();
              currentVerse = parseInt(verseNum, 10);
            } else if (leaf.text) {
              currentText += leaf.text;
            }
          }
        }
      }
    }
  }
  flush();

  return verses;
}

/* ── React Query hooks ── */

/** Fetch all available Bible versions */
export function useBibleVersions() {
  return useQuery<{ data: BibleVersion[] }>({
    queryKey: ["bible", "versions"],
    queryFn: () => fetchBible("/bibles"),
    staleTime: Infinity,
  });
}

/** Fetch the index (books & chapters) for a specific Bible version */
export function useBibleIndex(bibleId: number | undefined) {
  return useQuery<{ data: BibleIndex }>({
    queryKey: ["bible", "index", bibleId],
    queryFn: () => fetchBible(`/bibles/${bibleId}/index`),
    enabled: !!bibleId,
    staleTime: Infinity,
  });
}

/** Fetch a passage (chapter) of Bible text */
export function useBiblePassage(
  bibleId: number | undefined,
  passageUsfm: string | undefined, // e.g. "GEN.1" for Genesis chapter 1
) {
  return useQuery<PassageContent>({
    queryKey: ["bible", "passage", bibleId, passageUsfm],
    queryFn: () =>
      fetchBible(`/bibles/${bibleId}/passages/${passageUsfm}?format=json`),
    enabled: !!bibleId && !!passageUsfm,
    staleTime: Infinity,
  });
}
