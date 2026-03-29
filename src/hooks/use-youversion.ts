/**
 * Custom React hooks for the headless YouVersion integration.
 * Wraps @youversion/platform-core so we stay on React 18.
 */
import { useState, useEffect, useCallback } from "react";
import { getBibleClient, isYouVersionConfigured } from "@/lib/youversion/client";
import {
  DEFAULT_VERSION_ID,
  type VerseOfTheDayData,
  type PassageData,
} from "@/lib/youversion/types";

/* ── Curated fallback verses (used when API is unavailable) ── */
const FALLBACK_VERSES: VerseOfTheDayData[] = [
  {
    reference: "Psalm 46:10",
    usfm: "PSA.46.10",
    html: "<p>Be still, and know that I am God; I will be exalted among the nations, I will be exalted in the earth.</p>",
    copyright: "",
    versionName: "NIV",
  },
  {
    reference: "Philippians 4:6",
    usfm: "PHP.4.6",
    html: "<p>Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.</p>",
    copyright: "",
    versionName: "NIV",
  },
  {
    reference: "Jeremiah 29:12",
    usfm: "JER.29.12",
    html: "<p>Then you will call on me and come and pray to me, and I will listen to you.</p>",
    copyright: "",
    versionName: "NIV",
  },
  {
    reference: "1 Thessalonians 5:17",
    usfm: "1TH.5.17",
    html: "<p>Pray continually.</p>",
    copyright: "",
    versionName: "NIV",
  },
  {
    reference: "Matthew 6:6",
    usfm: "MAT.6.6",
    html: "<p>But when you pray, go into your room, close the door and pray to your Father, who is unseen. Then your Father, who sees what is done in secret, will reward you.</p>",
    copyright: "",
    versionName: "NIV",
  },
];

function getTodaysFallback(): VerseOfTheDayData {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return FALLBACK_VERSES[dayOfYear % FALLBACK_VERSES.length];
}

/* ── Session cache ── */
let cachedVOTD: VerseOfTheDayData | null = null;

/* ── useVerseOfTheDay ─────────────────────── */
export function useVerseOfTheDay(versionId = DEFAULT_VERSION_ID) {
  const [data, setData] = useState<VerseOfTheDayData | null>(cachedVOTD);
  const [loading, setLoading] = useState(!cachedVOTD);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cachedVOTD) {
      setData(cachedVOTD);
      setLoading(false);
      return;
    }

    if (!isYouVersionConfigured()) {
      const fallback = getTodaysFallback();
      setData(fallback);
      cachedVOTD = fallback;
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const bibleClient = getBibleClient();

        // Get today's day-of-year (1-based)
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 0);
        const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);

        // Fetch VOTD metadata via the ApiClient's raw GET
        // The VOTD endpoint: /v1/verse_of_the_day/{day_of_year}
        const { getApiClient } = await import("@/lib/youversion/client");
        const apiClient = getApiClient();
        const votdResponse = await apiClient.get<{
          verse: { usfm: string[]; human_reference: string };
          image: { url: string } | null;
        }>(`/v1/verse_of_the_day/${dayOfYear}`, {
          params: { version_id: String(versionId) },
        });

        if (cancelled) return;

        const usfm = votdResponse.verse.usfm.join("+");
        const reference = votdResponse.verse.human_reference;

        // Fetch the full passage HTML
        const passage = await bibleClient.getPassage(versionId, usfm, "html");

        if (cancelled) return;

        const result: VerseOfTheDayData = {
          reference,
          usfm,
          html: (passage as any).content ?? (passage as any).html ?? "",
          copyright: (passage as any).copyright?.text ?? "",
          versionName: (passage as any).version?.name ?? "NIV",
          imageUrl: votdResponse.image?.url,
        };

        cachedVOTD = result;
        setData(result);
      } catch (err) {
        if (cancelled) return;
        console.warn("[YouVersion] VOTD fetch failed, using fallback:", err);
        const fallback = getTodaysFallback();
        cachedVOTD = fallback;
        setData(fallback);
        setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [versionId]);

  return { data, loading, error };
}

/* ── usePassage ───────────────────────────── */
export function usePassage(usfm: string | null, versionId = DEFAULT_VERSION_ID) {
  const [data, setData] = useState<PassageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPassage = useCallback(async () => {
    if (!usfm || !isYouVersionConfigured()) return;

    setLoading(true);
    setError(null);

    try {
      const bibleClient = getBibleClient();
      const passage = await bibleClient.getPassage(versionId, usfm, "html");

      setData({
        reference: (passage as any).reference?.human ?? usfm,
        usfm,
        html: (passage as any).content ?? (passage as any).html ?? "",
        copyright: (passage as any).copyright?.text ?? "",
        versionName: (passage as any).version?.name ?? "NIV",
      });
    } catch (err) {
      console.warn("[YouVersion] Passage fetch failed:", err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [usfm, versionId]);

  useEffect(() => {
    fetchPassage();
  }, [fetchPassage]);

  return { data, loading, error, refetch: fetchPassage };
}
