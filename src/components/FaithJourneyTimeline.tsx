/**
 * FaithJourneyTimeline — A vertical timeline of spiritual milestones.
 * Shows: account creation, first prayer, streaks, answered prayers, testimonies.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Flame, Heart, BookOpen, Star, Sparkles, Calendar } from "lucide-react";

interface Milestone {
  id: string;
  date: string;
  icon: React.ElementType;
  iconColor: string;
  title: string;
  description: string;
}

export function FaithJourneyTimeline() {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["faith-journey-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("created_at, current_streak, longest_streak")
        .eq("id", user!.id)
        .single();
      return data;
    },
  });

  const { data: prayers } = useQuery({
    queryKey: ["faith-journey-prayers", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("prayer_cards")
        .select("id, created_at, title, status, labels")
        .eq("created_by", user!.id)
        .order("created_at", { ascending: true })
        .limit(200);
      return data || [];
    },
  });

  const { data: testimonies } = useQuery({
    queryKey: ["faith-journey-testimonies", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("prayer_cards")
        .select("id, created_at, title")
        .eq("created_by", user!.id)
        .eq("status", "answered")
        .order("created_at", { ascending: true })
        .limit(50);
      return data || [];
    },
  });

  const milestones = useMemo<Milestone[]>(() => {
    const items: Milestone[] = [];

    // Account creation
    if (profile?.created_at) {
      items.push({
        id: "joined",
        date: profile.created_at,
        icon: Star,
        iconColor: "var(--kp-gold)",
        title: "Began Your Journey",
        description: "You joined KeepPray.ing and opened your prayer closet.",
      });
    }

    // First prayer
    if (prayers && prayers.length > 0) {
      items.push({
        id: "first-prayer",
        date: prayers[0].created_at,
        icon: Heart,
        iconColor: "var(--kp-gold)",
        title: "First Prayer Written",
        description: `"${prayers[0].title || "Your first prayer"}" — the beginning of a conversation with God.`,
      });
    }

    // Prayer milestones (10, 25, 50, 100, 250, 500)
    const prayerMilestones = [10, 25, 50, 100, 250, 500];
    if (prayers) {
      for (const m of prayerMilestones) {
        if (prayers.length >= m) {
          items.push({
            id: `prayers-${m}`,
            date: prayers[m - 1].created_at,
            icon: BookOpen,
            iconColor: "var(--kp-green)",
            title: `${m} Prayers Written`,
            description: `You've poured out ${m} prayers before the throne of grace.`,
          });
        }
      }
    }

    // First testimony
    if (testimonies && testimonies.length > 0) {
      items.push({
        id: "first-testimony",
        date: testimonies[0].created_at,
        icon: Sparkles,
        iconColor: "var(--kp-gold)",
        title: "First Answered Prayer",
        description: `"${testimonies[0].title || "An answered prayer"}" — God showed up.`,
      });
    }

    // Streak milestones
    if (profile?.longest_streak && profile.longest_streak >= 7) {
      items.push({
        id: "streak-7",
        date: profile.created_at, // approximate
        icon: Flame,
        iconColor: "#f97316",
        title: `${profile.longest_streak}-Day Streak`,
        description: "Your longest prayer streak — faithful consistency in the secret place.",
      });
    }

    // Sort by date
    items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return items;
  }, [profile, prayers, testimonies]);

  if (!milestones.length) {
    return (
      <div className="text-center py-12 px-6">
        <Calendar className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--kp-text-muted)" }} />
        <p className="text-sm" style={{ color: "var(--kp-text-muted)" }}>
          Your faith journey will appear here as you pray, read, and grow.
        </p>
      </div>
    );
  }

  return (
    <div className="relative px-4 py-6">
      {/* Vertical timeline line */}
      <div
        className="absolute left-[27px] top-8 bottom-8 w-px"
        style={{ background: "var(--kp-border-gold)" }}
      />

      <div className="space-y-6">
        {milestones.map((m, i) => {
          const Icon = m.icon;
          const dateStr = new Date(m.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });

          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="relative flex gap-4 items-start"
            >
              {/* Icon dot */}
              <div
                className="relative z-10 w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0"
                style={{
                  background: "var(--kp-bg-elevated)",
                  border: `2px solid ${m.iconColor}`,
                  boxShadow: `0 0 12px ${m.iconColor}33`,
                }}
              >
                <Icon className="w-3 h-3" style={{ color: m.iconColor }} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pb-1">
                <p className="text-[10px] font-medium tracking-wider uppercase" style={{ color: "var(--kp-text-muted)" }}>
                  {dateStr}
                </p>
                <p className="text-sm font-semibold mt-0.5" style={{ color: "var(--kp-text-primary)" }}>
                  {m.title}
                </p>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--kp-text-body)" }}>
                  {m.description}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
