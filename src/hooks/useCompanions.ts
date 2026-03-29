import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/* ── Types ─────────────────────────────────────── */
export type Mood = "thriving" | "steady" | "struggling";
export type GroupType = "family" | "circle" | "partner";

export interface CompanionSettings {
  id: string;
  group_type: string;
  group_id: string;
  enabled: boolean;
  checkin_day: string;
  created_by: string;
}

export interface CompanionCheckin {
  id: string;
  group_type: string;
  group_id: string;
  user_id: string;
  mood: Mood;
  share_text: string | null;
  is_shared: boolean;
  week_of: string;
  created_at: string;
}

export interface CompanionGoal {
  id: string;
  group_type: string;
  group_id: string;
  user_id: string;
  title: string;
  target_count: number;
  current_count: number;
  created_at: string;
}

export interface CompanionEncouragement {
  id: string;
  group_type: string;
  group_id: string;
  from_user_id: string;
  to_user_id: string;
  message: string;
  emoji: string | null;
  created_at: string;
}

export interface PrayerPartner {
  id: string;
  user1_id: string;
  user2_id: string;
  status: string;
  created_at: string;
  accepted_at: string | null;
}

/* ── Helpers ───────────────────────────────────── */
function getWeekOf(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

/* ── Main hook ─────────────────────────────────── */
export function useCompanions(groupType: GroupType, groupId: string | undefined) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<CompanionSettings | null>(null);
  const [checkins, setCheckins] = useState<CompanionCheckin[]>([]);
  const [goals, setGoals] = useState<CompanionGoal[]>([]);
  const [encouragements, setEncouragements] = useState<CompanionEncouragement[]>([]);
  const [loading, setLoading] = useState(true);

  const weekOf = useMemo(() => getWeekOf(), []);

  const myCheckin = useMemo(
    () => checkins.find((c) => c.user_id === user?.id && c.week_of === weekOf),
    [checkins, user?.id, weekOf]
  );

  const hasCheckedIn = !!myCheckin;

  const moodCounts = useMemo(() => {
    const thisWeek = checkins.filter((c) => c.week_of === weekOf);
    return {
      thriving: thisWeek.filter((c) => c.mood === "thriving").length,
      steady: thisWeek.filter((c) => c.mood === "steady").length,
      struggling: thisWeek.filter((c) => c.mood === "struggling").length,
      total: thisWeek.length,
    };
  }, [checkins, weekOf]);

  const sharedMessages = useMemo(
    () => checkins.filter((c) => c.week_of === weekOf && c.is_shared && c.share_text),
    [checkins, weekOf]
  );

  /* ── Fetchers ────────────────────────────────── */
  const fetchAll = useCallback(async () => {
    if (!groupId || !user) return;
    setLoading(true);

    const [settingsRes, checkinsRes, goalsRes, encouragementsRes] = await Promise.all([
      groupType !== "partner"
        ? supabase
            .from("companion_settings")
            .select("*")
            .eq("group_type", groupType)
            .eq("group_id", groupId)
            .maybeSingle()
        : Promise.resolve({ data: { enabled: true, checkin_day: "Sunday" } as any }),
      supabase
        .from("companion_checkins")
        .select("*")
        .eq("group_type", groupType)
        .eq("group_id", groupId)
        .order("created_at", { ascending: false }),
      supabase
        .from("companion_goals")
        .select("*")
        .eq("group_type", groupType)
        .eq("group_id", groupId)
        .order("created_at", { ascending: false }),
      supabase
        .from("companion_encouragements")
        .select("*")
        .eq("group_type", groupType)
        .eq("group_id", groupId)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    if (settingsRes.data) setSettings(settingsRes.data as any);
    if (checkinsRes.data) setCheckins(checkinsRes.data as any);
    if (goalsRes.data) setGoals(goalsRes.data as any);
    if (encouragementsRes.data) setEncouragements(encouragementsRes.data as any);

    setLoading(false);
  }, [groupId, groupType, user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  /* ── Realtime ────────────────────────────────── */
  useEffect(() => {
    if (!groupId) return;

    const channel = supabase
      .channel(`companions-${groupType}-${groupId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "companion_checkins" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "companion_goals" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "companion_encouragements" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "companion_settings" }, () => fetchAll())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, groupType, fetchAll]);

  /* ── Actions ─────────────────────────────────── */
  const submitCheckin = useCallback(
    async (mood: Mood, shareText?: string, isShared?: boolean) => {
      if (!user || !groupId) return;
      const { error } = await supabase.from("companion_checkins").upsert(
        {
          group_type: groupType,
          group_id: groupId,
          user_id: user.id,
          mood,
          share_text: shareText || null,
          is_shared: isShared ?? false,
          week_of: weekOf,
        } as any,
        { onConflict: "group_type,group_id,user_id,week_of" }
      );
      return error;
    },
    [user, groupId, groupType, weekOf]
  );

  const createGoal = useCallback(
    async (title: string, targetCount: number = 7) => {
      if (!user || !groupId) return;
      await supabase.from("companion_goals").insert({
        group_type: groupType,
        group_id: groupId,
        user_id: user.id,
        title,
        target_count: targetCount,
      } as any);
    },
    [user, groupId, groupType]
  );

  const incrementGoal = useCallback(async (goalId: string, currentCount: number) => {
    await supabase
      .from("companion_goals")
      .update({ current_count: currentCount + 1 } as any)
      .eq("id", goalId);
  }, []);

  const sendEncouragement = useCallback(
    async (toUserId: string, message: string, emoji?: string) => {
      if (!user || !groupId) return;
      await supabase.from("companion_encouragements").insert({
        group_type: groupType,
        group_id: groupId,
        from_user_id: user.id,
        to_user_id: toUserId,
        message,
        emoji: emoji || null,
      } as any);

      // Also create a notification
      await supabase.from("notifications").insert({
        user_id: toUserId,
        type: "companion_encouragement",
        title: "Someone sent you encouragement 💛",
        body: message || (emoji ? `${emoji}` : "You are being prayed for."),
      } as any);
    },
    [user, groupId, groupType]
  );

  const updateSettings = useCallback(
    async (updates: Partial<CompanionSettings>) => {
      if (!groupId || !user) return;
      const { data: existing } = await supabase
        .from("companion_settings")
        .select("id")
        .eq("group_type", groupType)
        .eq("group_id", groupId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("companion_settings")
          .update(updates as any)
          .eq("id", existing.id);
      } else {
        await supabase.from("companion_settings").insert({
          group_type: groupType,
          group_id: groupId,
          created_by: user.id,
          ...updates,
        } as any);
      }
    },
    [groupId, groupType, user]
  );

  return {
    settings,
    checkins,
    goals,
    encouragements,
    loading,
    weekOf,
    myCheckin,
    hasCheckedIn,
    moodCounts,
    sharedMessages,
    submitCheckin,
    createGoal,
    incrementGoal,
    sendEncouragement,
    updateSettings,
    refetch: fetchAll,
  };
}

/* ── Prayer Partners Hook ──────────────────────── */
export function usePrayerPartners() {
  const { user } = useAuth();
  const [partners, setPartners] = useState<(PrayerPartner & { partnerProfile?: any })[]>([]);
  const [pending, setPending] = useState<(PrayerPartner & { requesterProfile?: any; partnerProfile?: any })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPartners = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data } = await supabase
      .from("prayer_partners")
      .select("*")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (data) {
      const accepted: any[] = [];
      const pendingReqs: any[] = [];

      for (const p of data as any[]) {
        const partnerId = p.user1_id === user.id ? p.user2_id : p.user1_id;
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, current_streak")
          .eq("id", partnerId)
          .maybeSingle();

        if (p.status === "accepted") {
          accepted.push({ ...p, partnerProfile: profile });
        } else if (p.status === "pending") {
          pendingReqs.push({ ...p, requesterProfile: profile, partnerProfile: profile });
        }
      }

      setPartners(accepted);
      setPending(pendingReqs);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("prayer-partners-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "prayer_partners" }, () => fetchPartners())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchPartners]);

  const sendRequest = useCallback(async (toUserId: string) => {
    if (!user) return;
    const { error } = await supabase.from("prayer_partners").insert({
      user1_id: user.id,
      user2_id: toUserId,
    } as any);
    return error;
  }, [user]);

  const acceptRequest = useCallback(async (partnerId: string) => {
    await supabase
      .from("prayer_partners")
      .update({ status: "accepted", accepted_at: new Date().toISOString() } as any)
      .eq("id", partnerId);
  }, []);

  const declineRequest = useCallback(async (partnerId: string) => {
    await supabase
      .from("prayer_partners")
      .update({ status: "declined" } as any)
      .eq("id", partnerId);
  }, []);

  const removePartner = useCallback(async (partnerId: string) => {
    await supabase.from("prayer_partners").delete().eq("id", partnerId);
  }, []);

  return {
    partners,
    pending,
    loading,
    sendRequest,
    acceptRequest,
    declineRequest,
    removePartner,
    refetch: fetchPartners,
  };
}
