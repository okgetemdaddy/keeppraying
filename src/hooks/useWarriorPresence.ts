/**
 * useWarriorPresence — Realtime Presence for Prayer Warriors.
 * When the user is marked as a warrior and "available," they join
 * a Supabase Realtime Presence channel so the Explore screen can
 * show who's online and praying.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface WarriorPresence {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface UseWarriorPresenceReturn {
  /** Whether the current user is a prayer warrior */
  isWarrior: boolean;
  /** Current warrior status: offline | available */
  warriorStatus: string;
  /** Toggle warrior status between available and offline */
  toggleWarrior: () => Promise<void>;
  /** List of currently online warriors */
  onlineWarriors: WarriorPresence[];
  /** Count of online warriors */
  onlineCount: number;
  loading: boolean;
}

export function useWarriorPresence(): UseWarriorPresenceReturn {
  const { user } = useAuth();
  const [isWarrior, setIsWarrior] = useState(false);
  const [warriorStatus, setWarriorStatus] = useState("offline");
  const [onlineWarriors, setOnlineWarriors] = useState<WarriorPresence[]>([]);
  const [loading, setLoading] = useState(false);
  const channelRef = useRef<any>(null);

  // Fetch warrior status on mount
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("is_prayer_warrior, warrior_status, full_name, avatar_url")
        .eq("id", user.id)
        .single();
      if (data) {
        setIsWarrior((data as any).is_prayer_warrior ?? false);
        setWarriorStatus((data as any).warrior_status ?? "offline");
      }
    })();
  }, [user]);

  // Join/leave presence channel based on warrior status
  useEffect(() => {
    // Always subscribe to track online warriors (even non-warriors see the count)
    const channel = supabase.channel("prayer-warriors", {
      config: { presence: { key: user?.id || "anon" } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const warriors: WarriorPresence[] = [];
        Object.values(state).forEach((presences: any) => {
          presences.forEach((p: any) => {
            warriors.push({
              user_id: p.user_id,
              full_name: p.full_name,
              avatar_url: p.avatar_url,
            });
          });
        });
        setOnlineWarriors(warriors);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED" && isWarrior && warriorStatus === "available" && user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", user.id)
            .single();
          await channel.track({
            user_id: user.id,
            full_name: profile?.full_name ?? null,
            avatar_url: profile?.avatar_url ?? null,
          });
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isWarrior, warriorStatus]);

  const toggleWarrior = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const newStatus = warriorStatus === "available" ? "offline" : "available";
      const newIsWarrior = newStatus === "available" ? true : isWarrior;

      await supabase
        .from("profiles")
        .update({
          is_prayer_warrior: newIsWarrior,
          warrior_status: newStatus,
        } as any)
        .eq("id", user.id);

      setWarriorStatus(newStatus);
      setIsWarrior(newIsWarrior);

      // Track or untrack presence
      if (channelRef.current) {
        if (newStatus === "available") {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", user.id)
            .single();
          await channelRef.current.track({
            user_id: user.id,
            full_name: profile?.full_name ?? null,
            avatar_url: profile?.avatar_url ?? null,
          });
        } else {
          await channelRef.current.untrack();
        }
      }
    } finally {
      setLoading(false);
    }
  }, [user, isWarrior, warriorStatus]);

  return {
    isWarrior,
    warriorStatus,
    toggleWarrior,
    onlineWarriors,
    onlineCount: onlineWarriors.length,
    loading,
  };
}
