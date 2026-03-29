import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Circle {
  id: string;
  name: string;
  description: string | null;
  purpose: string | null;
  created_by: string;
  max_members: number;
  ai_encouragement: boolean;
  is_public: boolean;
  schedule: any;
  created_at: string;
  updated_at: string;
}

export interface CircleMember {
  id: string;
  circle_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile?: { full_name: string | null; avatar_url: string | null; current_streak: number };
}

export interface CirclePrayer {
  id: string;
  circle_id: string;
  prayer_id: string;
  shared_by: string;
  created_at: string;
  prayer?: {
    id: string;
    title: string | null;
    prayer_text: string;
    prayed_count: number;
    likes_count: number;
    labels: string[] | null;
  };
}

export interface Encouragement {
  id: string;
  circle_id: string;
  content: string;
  generated_at: string;
}

export interface Homework {
  id: string;
  circle_id: string;
  title: string;
  description: string | null;
  homework_type: string;
  due_date: string | null;
  created_by: string;
  created_at: string;
}

export interface HomeworkSubmission {
  id: string;
  homework_id: string;
  user_id: string;
  content: string | null;
  prayer_id: string | null;
  submitted_at: string;
}

export function useAccountabilityCircles() {
  const { user } = useAuth();
  const [circles, setCircles] = useState<(Circle & { memberCount: number; role: string })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCircles = useCallback(async () => {
    if (!user) { setCircles([]); setLoading(false); return; }

    const { data: memberships } = await supabase
      .from("accountability_circle_members")
      .select("circle_id, role")
      .eq("user_id", user.id);

    if (!memberships || memberships.length === 0) {
      setCircles([]);
      setLoading(false);
      return;
    }

    const circleIds = memberships.map((m: any) => m.circle_id);
    const roleMap = Object.fromEntries(memberships.map((m: any) => [m.circle_id, m.role]));

    const { data: circleData } = await supabase
      .from("accountability_circles")
      .select("*")
      .in("id", circleIds)
      .order("created_at", { ascending: false });

    if (!circleData) { setCircles([]); setLoading(false); return; }

    const withCounts = await Promise.all(
      circleData.map(async (c: any) => {
        const { count } = await supabase
          .from("accountability_circle_members")
          .select("id", { count: "exact", head: true })
          .eq("circle_id", c.id);
        return { ...c, memberCount: count ?? 0, role: roleMap[c.id] || "member" } as Circle & { memberCount: number; role: string };
      })
    );

    setCircles(withCounts);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchCircles();

    const ch = supabase
      .channel("accountability-circles")
      .on("postgres_changes", { event: "*", schema: "public", table: "accountability_circle_members" }, () => fetchCircles())
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [fetchCircles]);

  return { circles, loading, refetch: fetchCircles };
}

export function useCircleDetail(circleId: string | undefined) {
  const { user } = useAuth();
  const [circle, setCircle] = useState<Circle | null>(null);
  const [members, setMembers] = useState<CircleMember[]>([]);
  const [prayers, setPrayers] = useState<CirclePrayer[]>([]);
  const [encouragements, setEncouragements] = useState<Encouragement[]>([]);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalPrayed: 0, totalPrayers: 0, avgStreak: 0 });

  const fetchAll = useCallback(async () => {
    if (!circleId || !user) return;

    const [circleRes, membersRes, prayersRes, encourageRes, homeworkRes] = await Promise.all([
      supabase.from("accountability_circles").select("*").eq("id", circleId).single(),
      supabase.from("accountability_circle_members").select("*").eq("circle_id", circleId),
      supabase.from("accountability_circle_prayers").select("*").eq("circle_id", circleId).order("created_at", { ascending: false }),
      supabase.from("accountability_encouragements").select("*").eq("circle_id", circleId).order("generated_at", { ascending: false }).limit(5),
      supabase.from("circle_homework").select("*").eq("circle_id", circleId).order("created_at", { ascending: false }),
    ]);

    if (circleRes.data) setCircle(circleRes.data as any);
    if (encourageRes.data) setEncouragements(encourageRes.data as any);
    if (homeworkRes.data) {
      setHomework(homeworkRes.data as any);
      // Fetch submissions for all homework
      const hwIds = (homeworkRes.data as any[]).map((h: any) => h.id);
      if (hwIds.length > 0) {
        const { data: subs } = await supabase
          .from("circle_homework_submissions")
          .select("*")
          .in("homework_id", hwIds);
        setSubmissions((subs || []) as any);
      }
    }

    // Enrich members with profile data
    if (membersRes.data) {
      const userIds = membersRes.data.map((m: any) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, current_streak")
        .in("id", userIds);

      const enriched = membersRes.data.map((m: any) => ({
        ...m,
        profile: profiles?.find((p: any) => p.id === m.user_id) || null,
      }));
      setMembers(enriched);

      const streaks = enriched.map((m: any) => m.profile?.current_streak || 0);
      setStats(prev => ({ ...prev, avgStreak: streaks.length ? Math.round(streaks.reduce((a: number, b: number) => a + b, 0) / streaks.length) : 0 }));
    }

    // Enrich prayers
    if (prayersRes.data && prayersRes.data.length > 0) {
      const prayerIds = prayersRes.data.map((p: any) => p.prayer_id);
      const { data: prayerCards } = await supabase
        .from("prayer_cards")
        .select("id, title, prayer_text, prayed_count, likes_count, labels")
        .in("id", prayerIds);

      const enrichedPrayers = prayersRes.data.map((cp: any) => ({
        ...cp,
        prayer: prayerCards?.find((pc: any) => pc.id === cp.prayer_id) || null,
      }));
      setPrayers(enrichedPrayers);
      setStats(prev => ({
        ...prev,
        totalPrayers: enrichedPrayers.length,
        totalPrayed: enrichedPrayers.reduce((sum: number, p: any) => sum + (p.prayer?.prayed_count || 0), 0),
      }));
    }

    setLoading(false);
  }, [circleId, user]);

  useEffect(() => {
    fetchAll();

    if (!circleId) return;
    const ch1 = supabase
      .channel(`circle-prayers-${circleId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "accountability_circle_prayers", filter: `circle_id=eq.${circleId}` }, () => fetchAll())
      .subscribe();
    const ch2 = supabase
      .channel(`circle-members-${circleId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "accountability_circle_members", filter: `circle_id=eq.${circleId}` }, () => fetchAll())
      .subscribe();
    const ch3 = supabase
      .channel(`circle-homework-${circleId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "circle_homework", filter: `circle_id=eq.${circleId}` }, () => fetchAll())
      .subscribe();

    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
      supabase.removeChannel(ch3);
    };
  }, [fetchAll, circleId]);

  return { circle, members, prayers, encouragements, homework, submissions, loading, stats, refetch: fetchAll };
}
