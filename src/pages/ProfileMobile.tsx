/**
 * ProfileMobile — Mobile-optimized profile screen.
 * Hero with avatar + stats, menu items matching mockup exactly.
 */

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useStreak } from "@/hooks/useStreak";
import { useWarriorPresence } from "@/hooks/useWarriorPresence";
import { getTheme, toggleTheme } from "@/lib/themeProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  Flame, Heart, BookOpen, Palette, Sun, Moon, Shield,
  Bell, HandHeart, LogOut, ChevronRight, Sparkles, Archive,
} from "lucide-react";

interface ProfileData {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export default function ProfileMobile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { streak } = useStreak();
  const { isWarrior, warriorStatus, toggleWarrior, loading: warriorLoading } = useWarriorPresence();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState({ prayers: 0, testimonies: 0 });
  const [theme, setThemeState] = useState(getTheme());

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: profileData }, { count: prayerCount }, { count: testiCount }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, avatar_url, created_at").eq("id", user.id).single(),
        supabase.from("prayer_cards").select("id", { count: "exact", head: true }).eq("created_by", user.id),
        supabase.from("testimonies").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      if (profileData) setProfile(profileData);
      setStats({ prayers: prayerCount ?? 0, testimonies: testiCount ?? 0 });
    })();
  }, [user]);

  const initials = useMemo(() => {
    if (profile?.full_name) return profile.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
    return user?.email?.slice(0, 2).toUpperCase() ?? "U";
  }, [profile, user]);

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "";

  const handleToggleTheme = () => {
    const next = toggleTheme();
    setThemeState(next);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const menuItems = [
    {
      icon: Sparkles,
      label: "Faith Journey",
      color: "rgba(180,140,50,0.15)",
      iconColor: "var(--kp-gold)",
      action: () => toast({ title: "Coming soon", description: "Your full faith journey timeline is in development." }),
    },
    {
      icon: Archive,
      label: "Prayer Archive",
      color: "rgba(139,92,246,0.12)",
      iconColor: "#8b5cf6",
      action: () => toast({ title: "Coming soon", description: "Prayer archive with search is in development." }),
    },
    {
      icon: Palette,
      label: "Board Theme",
      color: "rgba(59,130,246,0.12)",
      iconColor: "#3b82f6",
      action: () => navigate("/boardv2"),
    },
    {
      icon: theme === "dark" ? Sun : Moon,
      label: theme === "dark" ? "Light Mode" : "Dark Mode",
      color: theme === "dark" ? "rgba(250,204,21,0.12)" : "rgba(100,116,139,0.12)",
      iconColor: theme === "dark" ? "#facc15" : "#64748b",
      action: handleToggleTheme,
    },
    {
      icon: Shield,
      label: warriorStatus === "available" ? "On Prayer Duty ✓" : "Available for Prayer",
      color: "rgba(34,197,94,0.12)",
      iconColor: "#22c55e",
      action: toggleWarrior,
      loading: warriorLoading,
    },
    {
      icon: Bell,
      label: "Notifications",
      color: "rgba(249,115,22,0.12)",
      iconColor: "#f97316",
      action: () => toast({ title: "Coming soon", description: "Notification preferences coming shortly." }),
    },
    {
      icon: HandHeart,
      label: "Support KeepPray.ing",
      color: "rgba(236,72,153,0.12)",
      iconColor: "#ec4899",
      action: () => navigate("/support"),
    },
    {
      icon: LogOut,
      label: "Sign Out",
      color: "rgba(239,68,68,0.08)",
      iconColor: "#ef4444",
      action: handleSignOut,
    },
  ];

  return (
    <div
      className="min-h-screen pb-28"
      style={{ backgroundColor: "var(--kp-bg-deep)", color: "var(--kp-text-body)" }}
    >
      {/* Hero */}
      <div className="pt-8 pb-6 px-5">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center"
        >
          {/* Avatar */}
          <div className="relative mb-3">
            <div
              className="absolute -inset-1.5 rounded-full blur-md"
              style={{ background: "var(--kp-gold-glow)" }}
            />
            <Avatar className="relative w-20 h-20 border-2" style={{ borderColor: "var(--kp-border-gold)" }}>
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback
                className="text-xl font-bold"
                style={{ background: "var(--kp-bg-elevated)", color: "var(--kp-gold)" }}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>

          <h1 className="text-lg font-bold" style={{ fontFamily: "var(--kp-font-display)", color: "var(--kp-text-primary)" }}>
            {profile?.full_name || "Prayer Warrior"}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--kp-text-muted)" }}>
            Praying since {memberSince}
          </p>
        </motion.div>

        {/* Stat boxes */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { label: "Prayers", value: stats.prayers, icon: BookOpen },
            { label: "Day Streak", value: streak.currentStreak, icon: Flame },
            { label: "Testimonies", value: stats.testimonies, icon: Heart },
          ].map((s) => (
            <div
              key={s.label}
              className="flex flex-col items-center py-3 rounded-2xl"
              style={{
                backgroundColor: "var(--kp-bg-card)",
                border: "1px solid var(--kp-border)",
              }}
            >
              <s.icon className="w-4 h-4 mb-1" style={{ color: "var(--kp-gold)" }} />
              <span className="text-lg font-bold" style={{ color: "var(--kp-text-primary)" }}>
                {s.value}
              </span>
              <span className="text-[10px]" style={{ color: "var(--kp-text-muted)" }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Menu */}
      <div className="px-5 space-y-2">
        {menuItems.map((item, i) => (
          <motion.button
            key={item.label}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.04 }}
            onClick={item.action}
            disabled={item.loading}
            className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-left transition-all active:scale-[0.98] disabled:opacity-50"
            style={{
              backgroundColor: "var(--kp-bg-card)",
              border: "1px solid var(--kp-border)",
            }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: item.color }}
            >
              <item.icon className="w-4.5 h-4.5" style={{ color: item.iconColor }} />
            </div>
            <span className="flex-1 text-sm font-medium" style={{ color: "var(--kp-text-primary)" }}>
              {item.label}
            </span>
            <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "var(--kp-text-muted)" }} />
          </motion.button>
        ))}
      </div>
    </div>
  );
}
