import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getLocalCache, setLocalCache, cacheKeys } from "@/lib/localCache";

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastPrayedDate: string | null;
}

const MILESTONES = [7, 30, 100, 365];

export function useStreak() {
  const { user } = useAuth();
  const cached = user ? getLocalCache<StreakData>(cacheKeys.streak(user.id)) : null;
  const [streak, setStreak] = useState<StreakData>(cached ?? {
    currentStreak: 0,
    longestStreak: 0,
    lastPrayedDate: null,
  });
  const [milestone, setMilestone] = useState<number | null>(null);
  const [loading, setLoading] = useState(!cached);

  const fetchStreak = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("current_streak, longest_streak, last_prayed_date")
      .eq("id", user.id)
      .single();
    if (data) {
      const prev = streak.currentStreak;
      const next = (data as any).current_streak ?? 0;
      setStreak({
        currentStreak: next,
        longestStreak: (data as any).longest_streak ?? 0,
        lastPrayedDate: (data as any).last_prayed_date ?? null,
      });
      // Check if we just hit a milestone
      if (next > prev && MILESTONES.includes(next)) {
        setMilestone(next);
      }
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchStreak();
  }, [fetchStreak]);

  // Listen for realtime profile updates (streak changes from trigger)
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`streak-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          const d = payload.new as any;
          const prev = streak.currentStreak;
          const next = d.current_streak ?? 0;
          setStreak({
            currentStreak: next,
            longestStreak: d.longest_streak ?? 0,
            lastPrayedDate: d.last_prayed_date ?? null,
          });
          if (next > prev && MILESTONES.includes(next)) {
            setMilestone(next);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, streak.currentStreak]);

  const dismissMilestone = useCallback(() => setMilestone(null), []);

  return { streak, loading, milestone, dismissMilestone, refetch: fetchStreak };
}
