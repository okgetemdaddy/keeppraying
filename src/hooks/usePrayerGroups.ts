import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PrayerGroup {
  id: string;
  name: string;
  description: string | null;
  theme: string;
  invite_code: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  member_count?: number;
  role?: string;
}

export function usePrayerGroups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<PrayerGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGroups = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Get groups user is a member of
    const { data: memberships } = await supabase
      .from("prayer_group_members")
      .select("group_id, role")
      .eq("user_id", user.id);

    if (!memberships || memberships.length === 0) {
      setGroups([]);
      setLoading(false);
      return;
    }

    const groupIds = memberships.map((m: any) => m.group_id);
    const roleMap = Object.fromEntries(memberships.map((m: any) => [m.group_id, m.role]));

    const { data: groupData } = await supabase
      .from("prayer_groups")
      .select("*")
      .in("id", groupIds)
      .order("created_at", { ascending: false });

    // Get member counts
    const { data: countData } = await supabase
      .from("prayer_group_members")
      .select("group_id")
      .in("group_id", groupIds);

    const counts: Record<string, number> = {};
    (countData || []).forEach((r: any) => {
      counts[r.group_id] = (counts[r.group_id] || 0) + 1;
    });

    setGroups(
      (groupData || []).map((g: any) => ({
        ...g,
        member_count: counts[g.id] || 1,
        role: roleMap[g.id] || "member",
      }))
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const createGroup = useCallback(
    async (name: string, description?: string) => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("prayer_groups")
        .insert({ name, description: description || null, created_by: user.id })
        .select()
        .single();
      if (error || !data) return null;

      // Add creator as owner
      await supabase.from("prayer_group_members").insert({
        group_id: (data as any).id,
        user_id: user.id,
        role: "owner",
      });

      await fetchGroups();
      return data as PrayerGroup;
    },
    [user, fetchGroups]
  );

  const joinByCode = useCallback(
    async (code: string) => {
      if (!user) return { error: "Not signed in" };
      // Lookup group
      const { data: group } = await supabase
        .from("prayer_groups")
        .select("id")
        .eq("invite_code", code.trim().toLowerCase())
        .maybeSingle();

      if (!group) return { error: "Invalid invite code" };

      const { error } = await supabase.from("prayer_group_members").insert({
        group_id: (group as any).id,
        user_id: user.id,
        role: "member",
      });

      if (error) {
        if (error.code === "23505") return { error: "You're already in this group" };
        return { error: error.message };
      }

      await fetchGroups();
      return { error: null };
    },
    [user, fetchGroups]
  );

  const leaveGroup = useCallback(
    async (groupId: string) => {
      if (!user) return;
      await supabase
        .from("prayer_group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", user.id);
      await fetchGroups();
    },
    [user, fetchGroups]
  );

  return { groups, loading, createGroup, joinByCode, leaveGroup, refetch: fetchGroups };
}
