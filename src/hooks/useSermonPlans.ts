import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SermonPlan {
  id: string;
  created_by: string;
  sermon_title: string;
  video_id: string | null;
  daily_prompts: any[];
  starts_on: string;
  accountability_enabled: boolean;
  encouragement_enabled: boolean;
  reminder_time: string;
  created_at: string;
}

export interface SermonPlanMember {
  id: string;
  plan_id: string;
  user_id: string;
  completed_days: Record<string, boolean>;
  joined_at: string;
  accountability_enabled: boolean;
  encouragement_enabled: boolean;
}

export function useSermonPlans() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<SermonPlan[]>([]);
  const [memberships, setMemberships] = useState<SermonPlanMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlans = useCallback(async () => {
    if (!user) { setPlans([]); setMemberships([]); setLoading(false); return; }
    setLoading(true);
    try {
      // Fetch memberships first
      const { data: memberRows } = await supabase
        .from("sermon_plan_members")
        .select("*")
        .eq("user_id", user.id) as any;

      const mems = (memberRows || []) as SermonPlanMember[];
      setMemberships(mems);

      if (mems.length > 0) {
        const planIds = mems.map((m) => m.plan_id);
        const { data: planRows } = await supabase
          .from("sermon_prayer_plans")
          .select("*")
          .in("id", planIds)
          .order("created_at", { ascending: false }) as any;
        setPlans((planRows || []) as SermonPlan[]);
      } else {
        setPlans([]);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const createPlan = async (sermonTitle: string, videoId: string, dailyPrompts: any[]) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("sermon_prayer_plans")
      .insert({
        created_by: user.id,
        sermon_title: sermonTitle,
        video_id: videoId,
        daily_prompts: dailyPrompts,
      } as any)
      .select("*")
      .single();

    if (error) throw error;
    const plan = data as any as SermonPlan;

    // Auto-join as member
    await supabase.from("sermon_plan_members").insert({
      plan_id: plan.id,
      user_id: user.id,
    } as any);

    await fetchPlans();
    return plan;
  };

  const updateMemberToggles = async (planId: string, accountability: boolean, encouragement: boolean) => {
    if (!user) return;
    await supabase
      .from("sermon_plan_members")
      .update({
        accountability_enabled: accountability,
        encouragement_enabled: encouragement,
      } as any)
      .eq("plan_id", planId)
      .eq("user_id", user.id);
    setMemberships((prev) =>
      prev.map((m) =>
        m.plan_id === planId && m.user_id === user.id
          ? { ...m, accountability_enabled: accountability, encouragement_enabled: encouragement }
          : m
      )
    );
  };

  const markDayComplete = async (planId: string, day: string) => {
    if (!user) return;
    const mem = memberships.find((m) => m.plan_id === planId && m.user_id === user.id);
    if (!mem) return;
    const updated = { ...mem.completed_days, [day]: true };
    await supabase
      .from("sermon_plan_members")
      .update({ completed_days: updated } as any)
      .eq("plan_id", planId)
      .eq("user_id", user.id);
    setMemberships((prev) =>
      prev.map((m) =>
        m.plan_id === planId && m.user_id === user.id
          ? { ...m, completed_days: updated }
          : m
      )
    );
  };

  const getPlanMembers = async (planId: string) => {
    const { data } = await supabase
      .from("sermon_plan_members")
      .select("*")
      .eq("plan_id", planId) as any;
    return (data || []) as SermonPlanMember[];
  };

  return { plans, memberships, loading, createPlan, updateMemberToggles, markDayComplete, getPlanMembers, refetch: fetchPlans };
}
