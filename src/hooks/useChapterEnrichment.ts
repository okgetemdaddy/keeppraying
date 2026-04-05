import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/* ── Enrichment payload types ── */

export interface EnrichmentBunch {
  verseRange: [number, number];
  label: string;
  type: "thematic" | "narrative" | "doctrinal" | "prophetic" | "poetic";
}

export interface EnrichmentHighlight {
  verseId: number;
  tokenSpan: string;
  tag: "greek_root" | "hebrew_root" | "key_theme" | "repeated_word" | "literary_device";
  colorHint: "amber" | "cyan";
}

export interface EnrichmentCard {
  id: string;
  anchors: [number, number];
  title: string;
  body: string;
  citations: string[];
}

export interface EnrichmentCrossRef {
  from: number;
  to: string;
  type: "quotation" | "allusion" | "parallel" | "contrast" | "fulfillment";
}

export interface EnrichmentPayload {
  bunches: EnrichmentBunch[];
  highlights: EnrichmentHighlight[];
  cards: EnrichmentCard[];
  crossRefs: EnrichmentCrossRef[];
}

interface Verse {
  number: number;
  text: string;
}

export function useChapterEnrichment(
  bookUsfm?: string,
  chapterNumber?: number,
  versionId?: number,
  verses?: Verse[]
) {
  const [triggered, setTriggered] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const queryKey = ["enrichment", bookUsfm, chapterNumber, versionId];

  const query = useQuery<EnrichmentPayload>({
    queryKey,
    queryFn: async () => {
      if (!bookUsfm || !chapterNumber || !versionId || !verses?.length) {
        throw new Error("Missing chapter data");
      }

      const { data, error } = await supabase.functions.invoke("enrich-chapter", {
        body: {
          book_usfm: bookUsfm,
          chapter_number: chapterNumber,
          version_id: versionId,
          verses: verses.map((v) => ({ number: v.number, text: v.text })),
        },
      });

      if (error) {
        // Surface rate limit / payment errors
        const msg = (error as any)?.message || String(error);
        if (msg.includes("429") || msg.includes("high demand")) {
          toast({
            title: "Deep Study is busy",
            description: "Please try again in a moment.",
            variant: "destructive",
          });
        } else if (msg.includes("402") || msg.includes("limit reached")) {
          toast({
            title: "Usage limit reached",
            description: "Deep Study is temporarily unavailable.",
            variant: "destructive",
          });
        }
        throw error;
      }

      return data as EnrichmentPayload;
    },
    enabled: triggered && !!bookUsfm && !!chapterNumber && !!versionId && !!verses?.length,
    staleTime: Infinity,
    retry: false,
  });

  const trigger = useCallback(() => {
    if (!bookUsfm || !chapterNumber || !versionId || !verses?.length) {
      toast({
        title: "Navigate to a chapter first",
        description: "Open a chapter to begin Deep Study.",
        variant: "destructive",
      });
      return;
    }
    // If we already have cached data, just set triggered
    const existing = queryClient.getQueryData(queryKey);
    if (existing) {
      setTriggered(true);
      return;
    }
    setTriggered(true);
    // Invalidate to re-fetch
    queryClient.invalidateQueries({ queryKey });
  }, [bookUsfm, chapterNumber, versionId, verses, queryClient, queryKey, toast]);

  const close = useCallback(() => {
    setTriggered(false);
  }, []);

  return {
    data: triggered ? (query.data ?? null) : null,
    isLoading: triggered && query.isLoading,
    isError: query.isError,
    active: triggered,
    trigger,
    close,
  };
}
