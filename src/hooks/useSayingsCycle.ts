import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const FALLBACK_SAYINGS = [
  "God answers prayer",
  "God is listening",
  "He bottles every tear — Psalm 56:8",
  "Prayer works",
  "You are never praying alone",
];

const MIN_INTERVAL = 45_000;
const MAX_INTERVAL = 90_000;
const DISPLAY_DURATION = 6_000;

export function useSayingsCycle() {
  const [sayings, setSayings] = useState<string[]>(FALLBACK_SAYINGS);
  const [currentSaying, setCurrentSaying] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("keeppraying_sayings")
        .select("text")
        .eq("is_active", true);
      if (data && data.length > 0) {
        setSayings(data.map((d: any) => d.text));
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

  return { currentSaying };
}
