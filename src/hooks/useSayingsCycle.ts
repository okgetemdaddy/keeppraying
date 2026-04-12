import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getLocalCacheWithTTL, setLocalCache, cacheKeys } from "@/lib/localCache";

const FALLBACK_SAYINGS = [
  "God answers prayer",
  "God is listening",
  "He bottles every tear — Psalm 56:8",
  "Prayer works",
  "You are never praying alone",
];

/** Brand sayings that rotate in the Explore header */
const BRAND_SAYINGS = [
  "KeepPray.ing",
  "Keep Believing",
  "Keep Trusting",
  "Keep Hoping",
  "Keep Seeking",
  "Keep Praising",
  "Keep Standing",
];

const MIN_INTERVAL = 45_000;
const MAX_INTERVAL = 90_000;
const DISPLAY_DURATION = 6_000;

export function useSayingsCycle() {
  // Stale-while-revalidate: use cached sayings (24h TTL) instantly
  const cached = getLocalCacheWithTTL<string[]>(cacheKeys.sayings(), 24 * 60 * 60 * 1000);
  const [sayings, setSayings] = useState<string[]>(cached ?? FALLBACK_SAYINGS);
  const [currentSaying, setCurrentSaying] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("keeppraying_sayings")
        .select("text")
        .eq("is_active", true);
      if (data && data.length > 0) {
        const texts = data.map((d: any) => d.text);
        setSayings(texts);
        setLocalCache(cacheKeys.sayings(), texts);
      }
    })();
  }, []);

  const showRandom = useCallback(() => {
    const pick = sayings[Math.floor(Math.random() * sayings.length)];
    setCurrentSaying(pick);
    setTimeout(() => setCurrentSaying(null), DISPLAY_DURATION);
  }, [sayings]);

  useEffect(() => {
    const initialTimeout = setTimeout(showRandom, 12_000);
    const interval = setInterval(
      showRandom,
      MIN_INTERVAL + Math.random() * (MAX_INTERVAL - MIN_INTERVAL)
    );
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [showRandom]);

  // Brand saying cycle for Explore header (5s interval, separate from DB sayings)
  const [brandIdx, setBrandIdx] = useState(0);
  const brandSaying = BRAND_SAYINGS[brandIdx];

  useEffect(() => {
    const interval = setInterval(() => {
      setBrandIdx((prev) => (prev + 1) % BRAND_SAYINGS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return { currentSaying, brandSaying };
}
