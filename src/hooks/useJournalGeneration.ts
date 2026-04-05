import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Verse {
  number: number;
  text: string;
}

interface GenerationResult {
  journal_text: string;
  lens_used: string;
  model_used: string;
  tags: string[];
  summary_line: string;
  entry_id: string | null;
}

export function useJournalGeneration(
  bookUsfm?: string,
  chapterNumber?: number,
  chapterTitle?: string,
  verses?: Verse[],
  versionId?: number
) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastResult, setLastResult] = useState<GenerationResult | null>(null);
  const { toast } = useToast();

  const generate = useCallback(async (): Promise<GenerationResult | null> => {
    if (!bookUsfm || !chapterNumber || !verses?.length) {
      toast({ title: "Missing chapter data", description: "Navigate to a chapter first.", variant: "destructive" });
      return null;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-journal", {
        body: {
          book_usfm: bookUsfm,
          chapter_number: chapterNumber,
          chapter_title: chapterTitle,
          verses,
          version_id: versionId || 1,
          model_hint: "default",
        },
      });

      if (error) throw error;
      setLastResult(data);
      return data as GenerationResult;
    } catch (err: any) {
      console.error("Bible Sight generation error:", err);
      toast({
        title: "Bible Sight unavailable",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [bookUsfm, chapterNumber, chapterTitle, verses, versionId, toast]);

  const refreshAndUpdate = useCallback(
    async (parentEntryId?: string): Promise<GenerationResult | null> => {
      if (!bookUsfm || !chapterNumber || !verses?.length) return null;

      setIsRefreshing(true);
      try {
        const { data, error } = await supabase.functions.invoke("generate-journal", {
          body: {
            book_usfm: bookUsfm,
            chapter_number: chapterNumber,
            chapter_title: chapterTitle,
            verses,
            version_id: versionId || 1,
            model_hint: "refresh",
            parent_entry_id: parentEntryId,
            exclude_lens: lastResult?.lens_used,
          },
        });

        if (error) throw error;
        setLastResult(data);
        return data as GenerationResult;
      } catch (err: any) {
        console.error("Bible Sight refresh error:", err);
        toast({
          title: "Refresh unavailable",
          description: "Please try again in a moment.",
          variant: "destructive",
        });
        return null;
      } finally {
        setIsRefreshing(false);
      }
    },
    [bookUsfm, chapterNumber, chapterTitle, verses, versionId, lastResult?.lens_used, toast]
  );

  return { generate, refreshAndUpdate, isGenerating, isRefreshing, lastResult };
}
