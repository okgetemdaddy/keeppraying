import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface FamilyRoom {
  id: string;
  name: string;
  description: string | null;
  theme: string;
  child_friendly: boolean;
  created_by: string;
  created_at: string;
  member_count?: number;
  role?: string;
}

export function useFamilyRooms() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<FamilyRoom[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRooms = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: memberships } = await supabase
      .from("family_room_members")
      .select("room_id, role")
      .eq("user_id", user.id);

    if (!memberships || memberships.length === 0) {
      setRooms([]);
      setLoading(false);
      return;
    }

    const roomIds = memberships.map((m: any) => m.room_id);
    const roleMap = Object.fromEntries(memberships.map((m: any) => [m.room_id, m.role]));

    const { data: roomData } = await supabase
      .from("family_rooms")
      .select("*")
      .in("id", roomIds)
      .order("created_at", { ascending: false });

    const { data: countData } = await supabase
      .from("family_room_members")
      .select("room_id")
      .in("room_id", roomIds);

    const counts: Record<string, number> = {};
    (countData || []).forEach((r: any) => {
      counts[r.room_id] = (counts[r.room_id] || 0) + 1;
    });

    setRooms(
      (roomData || []).map((r: any) => ({
        ...r,
        member_count: counts[r.id] || 1,
        role: roleMap[r.id] || "member",
      }))
    );
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  const createRoom = useCallback(async (name: string, description?: string, childFriendly?: boolean) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("family_rooms")
      .insert({ name, description: description || null, child_friendly: childFriendly || false, created_by: user.id })
      .select()
      .single();
    if (error || !data) return null;

    await supabase.from("family_room_members").insert({
      room_id: (data as any).id,
      user_id: user.id,
      role: "owner",
    });

    await fetchRooms();
    return data as FamilyRoom;
  }, [user, fetchRooms]);

  const joinByCode = useCallback(async (code: string) => {
    if (!user) return { error: "Not signed in" };
    const { data: room } = await supabase
      .from("family_rooms")
      .select("id")
      .eq("invite_code", code.trim().toLowerCase())
      .maybeSingle();

    if (!room) return { error: "Invalid family code" };

    const { error } = await supabase.from("family_room_members").insert({
      room_id: (room as any).id,
      user_id: user.id,
      role: "member",
    });

    if (error) {
      if (error.code === "23505") return { error: "Already a member" };
      return { error: error.message };
    }

    await fetchRooms();
    return { error: null };
  }, [user, fetchRooms]);

  const leaveRoom = useCallback(async (roomId: string) => {
    if (!user) return;
    await supabase.from("family_room_members").delete().eq("room_id", roomId).eq("user_id", user.id);
    await fetchRooms();
  }, [user, fetchRooms]);

  return { rooms, loading, createRoom, joinByCode, leaveRoom, refetch: fetchRooms };
}
