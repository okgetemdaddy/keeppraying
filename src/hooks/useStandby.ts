import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface StandbyState {
  isOnStandby: boolean;
  expiresAt: string | null;
  onlineCount: number;
  loading: boolean;
  toggleStandby: (durationMinutes?: number) => Promise<void>;
}

export function useStandby(): StandbyState {
  const { user } = useAuth();
  const [isOnStandby, setIsOnStandby] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch current standby status
  const fetchStatus = useCallback(async () => {
    if (!user) { setIsOnStandby(false); setOnlineCount(0); return; }

    const [{ data: own }, { count }] = await Promise.all([
      supabase
        .from("prayer_standby")
        .select("is_active, expires_at")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("prayer_standby")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true),
    ]);

    if (own) {
      // Check if expired
      if (own.expires_at && new Date(own.expires_at) < new Date()) {
        // Auto-deactivate
        await supabase
          .from("prayer_standby")
          .update({ is_active: false })
          .eq("user_id", user.id);
        setIsOnStandby(false);
        setExpiresAt(null);
      } else {
        setIsOnStandby(own.is_active);
        setExpiresAt(own.expires_at);
      }
    } else {
      setIsOnStandby(false);
      setExpiresAt(null);
    }

    setOnlineCount(count || 0);
  }, [user]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Realtime subscription for count updates
  useEffect(() => {
    const channel = supabase
      .channel("standby-count")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "prayer_standby" },
        () => {
          // Re-fetch count on any change
          supabase
            .from("prayer_standby")
            .select("*", { count: "exact", head: true })
            .eq("is_active", true)
            .then(({ count }) => setOnlineCount(count || 0));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const toggleStandby = useCallback(async (durationMinutes?: number) => {
    if (!user) return;
    setLoading(true);

    try {
      if (isOnStandby) {
        // Turn off
        await supabase
          .from("prayer_standby")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq("user_id", user.id);
        setIsOnStandby(false);
        setExpiresAt(null);
      } else {
        // Turn on (upsert)
        const expires = durationMinutes
          ? new Date(Date.now() + durationMinutes * 60 * 1000).toISOString()
          : null;

        await supabase
          .from("prayer_standby")
          .upsert({
            user_id: user.id,
            is_active: true,
            expires_at: expires,
            started_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });

        setIsOnStandby(true);
        setExpiresAt(expires);
      }
    } finally {
      setLoading(false);
    }
  }, [user, isOnStandby]);

  return { isOnStandby, expiresAt, onlineCount, loading, toggleStandby };
}
