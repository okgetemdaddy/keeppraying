import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CrossReference {
  reference: string;
  bookUsfm: string;
  chapter: number;
  verse: number;
  preview: string;
  relevance: string;
}

export interface WordStudyResult {
  originalWord: string;
  transliteration: string;
  strongsNumber: string;
  definition: string;
  frequency: number;
  semanticRange: string[];
  crossReferences: CrossReference[];
  contextualNote: string;
}

async function fetchWordStudy(
  word: string,
  verseText: string,
  bookUsfm: string,
  chapter: string,
  verseNumber: number,
  translationId?: number,
): Promise<WordStudyResult> {
  const { data, error } = await supabase.functions.invoke("word-study", {
    body: { word, verseText, bookUsfm, chapter, verseNumber, translationId },
  });

  if (error) throw new Error(error.message ?? "Word study failed");
  if (data?.error) throw new Error(data.error);
  return data as WordStudyResult;
}

export function useWordStudy(
  word: string | undefined,
  verseText: string | undefined,
  bookUsfm: string | undefined,
  chapter: string | undefined,
  verseNumber: number | undefined,
  translationId?: number,
) {
  return useQuery({
    queryKey: ["word-study", word, bookUsfm, chapter, verseNumber],
    queryFn: () => fetchWordStudy(word!, verseText!, bookUsfm!, chapter!, verseNumber!, translationId),
    enabled: !!word && !!verseText && !!bookUsfm && !!chapter && verseNumber != null,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    retry: 1,
  });
}
