import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface BreathPrayer {
  id: string;
  prayer_text: string;
  labels: string[] | null;
  extended_prayer: string | null;
  meditation_essay: string | null;
  meditation_link: string | null;
  likes_count: number;
  prayed_count: number;
  created_at: string;
  created_by: string | null;
  status: string;
}

export function useBreathPrayers() {
  const [prayers, setPrayers] = useState<BreathPrayer[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase
      .from("prayer_cards")
      .select("id, prayer_text, labels, extended_prayer, likes_count, prayed_count, created_at, created_by, status")
      .eq("prayer_type", "breath")
      .in("status", ["approved", "ai_generated"])
      .order("created_at", { ascending: false })
      .limit(50) as any);
    setPrayers((data as BreathPrayer[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("breath-prayers")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "prayer_cards",
        filter: "prayer_type=eq.breath",
      }, () => { load(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [load]);

  return { prayers, loading, refresh: load };
}

export function useDailyBreath() {
  const [prayer, setPrayer] = useState<BreathPrayer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data: daily } = await supabase
        .from("daily_breath" as any)
        .select("prayer_id")
        .eq("active_date", today)
        .maybeSingle();

      if (daily?.prayer_id) {
        const { data: card } = await supabase
          .from("prayer_cards")
          .select("id, prayer_text, labels, extended_prayer, meditation_essay, meditation_link, likes_count, prayed_count, created_at, created_by, status")
          .eq("id", daily.prayer_id)
          .single();
        setPrayer(card as unknown as BreathPrayer | null);
      } else {
        // Fallback: pick a random approved breath prayer
        const { data: random } = await supabase
          .from("prayer_cards")
          .select("id, prayer_text, labels, extended_prayer, meditation_essay, meditation_link, likes_count, prayed_count, created_at, created_by, status")
          .eq("prayer_type" as any, "breath")
          .in("status", ["approved", "ai_generated"])
          .limit(10);
        if (random && random.length > 0) {
          const pick = random[Math.floor(Math.random() * random.length)];
          setPrayer(pick as unknown as BreathPrayer);
        }
      }
      setLoading(false);
    };
    load();
  }, []);

  return { prayer, loading };
}
