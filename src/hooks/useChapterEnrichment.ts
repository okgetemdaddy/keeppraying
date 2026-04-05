import { useState, useCallback, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
  cardType?: "exegesis" | "word_study" | "historical_parallel" | "theological_depth";
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

function mergePayloads(primary: EnrichmentPayload | null, secondary: EnrichmentPayload | null): EnrichmentPayload | null {
  if (!primary && !secondary) return null;
  if (!primary) return secondary;
  if (!secondary) return primary;

  return {
    bunches: primary.bunches,
    highlights: [...primary.highlights, ...secondary.highlights],
    cards: [...primary.cards, ...secondary.cards],
    crossRefs: [...primary.crossRefs, ...secondary.crossRefs],
  };
}

export function useChapterEnrichment(
  bookUsfm?: string,
  chapterNumber?: number,
  versionId?: number,
  verses?: Verse[]
) {
  const [triggered, setTriggered] = useState(false);
  const [primaryData, setPrimaryData] = useState<EnrichmentPayload | null>(null);
  const [secondaryData, setSecondaryData] = useState<EnrichmentPayload | null>(null);
  const [primaryLoading, setPrimaryLoading] = useState(false);
  const [secondaryLoading, setSecondaryLoading] = useState(false);
  const [primaryError, setPrimaryError] = useState(false);
  const { toast } = useToast();
  const journalTriggeredRef = useRef(false);
  const prevChapterRef = useRef<string>("");

  // Reset when chapter changes
  const chapterKey = `${bookUsfm}.${chapterNumber}.${versionId}`;
  useEffect(() => {
    if (chapterKey !== prevChapterRef.current) {
      prevChapterRef.current = chapterKey;
      setTriggered(false);
      setPrimaryData(null);
      setSecondaryData(null);
      setPrimaryLoading(false);
      setSecondaryLoading(false);
      setPrimaryError(false);
      journalTriggeredRef.current = false;
    }
  }, [chapterKey]);

  const fetchPass = useCallback(async (pass: "primary" | "secondary") => {
    if (!bookUsfm || !chapterNumber || !versionId || !verses?.length) return null;

    const { data, error } = await supabase.functions.invoke("enrich-chapter", {
      body: {
        book_usfm: bookUsfm,
        chapter_number: chapterNumber,
        version_id: versionId,
        verses: verses.map((v) => ({ number: v.number, text: v.text })),
        pass,
      },
    });

    if (error) {
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
  }, [bookUsfm, chapterNumber, versionId, verses, toast]);

  const trigger = useCallback(async () => {
    if (!bookUsfm || !chapterNumber || !versionId || !verses?.length) {
      toast({
        title: "Navigate to a chapter first",
        description: "Open a chapter to begin Deep Study.",
        variant: "destructive",
      });
      return;
    }

    setTriggered(true);
    journalTriggeredRef.current = false;

    // Fire both passes in parallel
    setPrimaryLoading(true);
    setSecondaryLoading(true);
    setPrimaryError(false);

    // Primary pass
    fetchPass("primary")
      .then((data) => {
        if (data) setPrimaryData(data);
        setPrimaryLoading(false);
      })
      .catch(() => {
        setPrimaryLoading(false);
        setPrimaryError(true);
      });

    // Secondary pass
    fetchPass("secondary")
      .then((data) => {
        if (data) setSecondaryData(data);
        setSecondaryLoading(false);
      })
      .catch(() => {
        setSecondaryLoading(false);
      });
  }, [bookUsfm, chapterNumber, versionId, verses, fetchPass, toast]);

  const close = useCallback(() => {
    setTriggered(false);
  }, []);

  const merged = triggered ? mergePayloads(primaryData, secondaryData) : null;

  return {
    data: merged,
    primaryData: triggered ? primaryData : null,
    secondaryData: triggered ? secondaryData : null,
    isLoading: triggered && primaryLoading,
    isLoadingMore: triggered && secondaryLoading,
    isError: primaryError,
    active: triggered,
    trigger,
    close,
    /** Whether journal auto-generation should fire */
    shouldAutoJournal: triggered && !!primaryData && !journalTriggeredRef.current,
    markJournalTriggered: () => { journalTriggeredRef.current = true; },
  };
}
