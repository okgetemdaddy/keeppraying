import { useState, useEffect, useMemo } from "react";
import SacredSpinner from "@/components/SacredSpinner";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SiteNav } from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import VerseLink from "@/components/VerseLink";
import {
  Flame, Heart, BookOpen, Users, Home, Swords, Music,
  Calendar, Eye, EyeOff, Edit2, Check, X, Award, Star,
  MessageSquareHeart, HandHeart, ChevronRight, Shield,
  Crown, Zap, Sparkles, Share2, QrCode, Copy,
  LayoutDashboard, Wind,
} from "lucide-react";

/* ── types ─────────────────────────────────────────────── */
interface ProfileData {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_public: boolean;
  current_streak: number;
  longest_streak: number;
  is_donor: boolean;
  is_founder: boolean;
  created_at: string;
}

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  date: string;
}

/* ── badge definitions ─────────────────────────────────── */
const BADGE_DEFS = [
  { key: "founder", label: "Founder", icon: Crown, color: "text-amber-500", tooltip: "Among the first to join KeepPray.ing" },
  { key: "donor", label: "Supporter", icon: Heart, color: "text-rose-500", tooltip: "Generously supporting the mission" },
  { key: "streak7", label: "7-Day Streak", icon: Flame, color: "text-orange-500", tooltip: "Prayed 7 days in a row" },
  { key: "streak30", label: "30-Day Streak", icon: Flame, color: "text-red-500", tooltip: "Prayed 30 days in a row" },
  { key: "streak100", label: "100-Day Streak", icon: Zap, color: "text-yellow-500", tooltip: "Prayed 100 days in a row" },
  { key: "streak365", label: "Year of Prayer", icon: Star, color: "text-gold", tooltip: "Prayed every day for a year" },
  { key: "warrior1", label: "Prayer Warrior", icon: Shield, color: "text-emerald-500", tooltip: "Prayed for 50+ others" },
  { key: "warrior2", label: "Mighty Warrior", icon: Swords, color: "text-primary", tooltip: "Prayed for 200+ others" },
  { key: "testifier", label: "Testifier", icon: Sparkles, color: "text-violet-500", tooltip: "Shared testimonies of God's faithfulness" },
];

/* ── component ─────────────────────────────────────────── */
export default function Profile() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const isOwnProfile = !id || id === user?.id;
  const profileId = isOwnProfile ? user?.id : id;

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingBio, setEditingBio] = useState(false);
  const [bioDraft, setBioDraft] = useState("");
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [stats, setStats] = useState({
    totalPrayers: 0,
    prayedForOthers: 0,
    testimonies: 0,
    totalDaysPrayed: 0,
    favoriteLabels: [] as string[],
  });
  const [earnedBadges, setEarnedBadges] = useState<string[]>([]);

  /* ── fetch profile ── */
  useEffect(() => {
    if (!profileId) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profileId)
        .single();
      if (data) {
        setProfile({
          id: data.id,
          full_name: data.full_name,
          email: data.email,
          avatar_url: data.avatar_url,
          bio: (data as any).bio ?? null,
          is_public: (data as any).is_public ?? false,
          current_streak: data.current_streak,
          longest_streak: data.longest_streak,
          is_donor: data.is_donor,
          is_founder: data.is_founder,
          created_at: data.created_at,
        });
        setBioDraft((data as any).bio ?? "");
      }
      setLoading(false);
    })();
  }, [profileId]);

  /* ── fetch stats ── */
  useEffect(() => {
    if (!profileId) return;
    (async () => {
      const [prayers, prayed, testis, labels] = await Promise.all([
        supabase.from("prayer_cards").select("id", { count: "exact", head: true }).eq("created_by", profileId),
        supabase.from("prayed_actions").select("id", { count: "exact", head: true }).eq("user_id", profileId),
        supabase.from("testimonies").select("id", { count: "exact", head: true }).eq("user_id", profileId),
        supabase.from("prayer_cards").select("labels").eq("created_by", profileId),
      ]);

      // Count unique prayed dates for total days prayed
      const { data: prayedDates } = await supabase
        .from("prayed_actions")
        .select("created_at")
        .eq("user_id", profileId);
      const uniqueDays = new Set(
        (prayedDates ?? []).map((d) => new Date(d.created_at).toDateString())
      );

      // Favorite labels
      const labelCount: Record<string, number> = {};
      (labels.data ?? []).forEach((p) => {
        ((p.labels as string[]) ?? []).forEach((l) => {
          labelCount[l] = (labelCount[l] || 0) + 1;
        });
      });
      const sortedLabels = Object.entries(labelCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([l]) => l);

      setStats({
        totalPrayers: prayers.count ?? 0,
        prayedForOthers: prayed.count ?? 0,
        testimonies: testis.count ?? 0,
        totalDaysPrayed: uniqueDays.size,
        favoriteLabels: sortedLabels,
      });

      // Compute badges
      const badges: string[] = [];
      if (profile?.is_founder) badges.push("founder");
      if (profile?.is_donor) badges.push("donor");
      if ((profile?.longest_streak ?? 0) >= 7) badges.push("streak7");
      if ((profile?.longest_streak ?? 0) >= 30) badges.push("streak30");
      if ((profile?.longest_streak ?? 0) >= 100) badges.push("streak100");
      if ((profile?.longest_streak ?? 0) >= 365) badges.push("streak365");
      if ((prayed.count ?? 0) >= 50) badges.push("warrior1");
      if ((prayed.count ?? 0) >= 200) badges.push("warrior2");
      if ((testis.count ?? 0) >= 1) badges.push("testifier");
      setEarnedBadges(badges);
    })();
  }, [profileId, profile]);

  /* ── fetch activity feed ── */
  useEffect(() => {
    if (!profileId) return;
    (async () => {
      const [prayers, prayed, testis] = await Promise.all([
        supabase
          .from("prayer_cards")
          .select("id, title, prayer_text, created_at, prayer_type")
          .eq("created_by", profileId)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("prayed_actions")
          .select("id, prayer_id, created_at")
          .eq("user_id", profileId)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("testimonies")
          .select("id, body, created_at")
          .eq("user_id", profileId)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      const items: ActivityItem[] = [];
      (prayers.data ?? []).forEach((p) => {
        items.push({
          id: `prayer-${p.id}`,
          type: p.prayer_type === "breath" ? "breath" : "prayer_created",
          title: p.prayer_type === "breath" ? "Breath Prayer" : "Created a Prayer",
          subtitle: p.title || p.prayer_text?.slice(0, 80),
          date: p.created_at,
        });
      });
      (prayed.data ?? []).forEach((p) => {
        items.push({
          id: `prayed-${p.id}`,
          type: "prayed",
          title: "Prayed for Someone",
          date: p.created_at,
        });
      });
      (testis.data ?? []).forEach((t) => {
        items.push({
          id: `testi-${t.id}`,
          type: "testimony",
          title: "Shared a Testimony",
          subtitle: t.body?.slice(0, 80),
          date: t.created_at,
        });
      });

      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setActivity(items.slice(0, 20));
    })();
  }, [profileId]);

  /* ── save bio ── */
  const saveBio = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ bio: bioDraft } as any)
      .eq("id", user.id);
    if (!error) {
      setProfile((p) => p ? { ...p, bio: bioDraft } : p);
      setEditingBio(false);
      toast({ title: "Bio updated" });
    }
  };

  /* ── toggle privacy ── */
  const togglePrivacy = async () => {
    if (!user || !profile) return;
    const newVal = !profile.is_public;
    await supabase
      .from("profiles")
      .update({ is_public: newVal } as any)
      .eq("id", user.id);
    setProfile((p) => p ? { ...p, is_public: newVal } : p);
    toast({ title: newVal ? "Profile is now public" : "Profile is now private" });
  };

  /* ── share link ── */
  const shareProfile = () => {
    const url = `${window.location.origin}/profile/${profileId}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Profile link copied!" });
  };

  /* ── initials ── */
  const initials = useMemo(() => {
    if (profile?.full_name) {
      return profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
    }
    return profile?.email?.slice(0, 2).toUpperCase() ?? "U";
  }, [profile]);

  const activityIcon = (type: string) => {
    switch (type) {
      case "prayer_created": return <BookOpen className="w-4 h-4 text-primary" />;
      case "prayed": return <HandHeart className="w-4 h-4 text-emerald-500" />;
      case "testimony": return <Sparkles className="w-4 h-4 text-violet-500" />;
      case "breath": return <Wind className="w-4 h-4 text-sky-500" />;
      default: return <Heart className="w-4 h-4 text-muted-foreground" />;
    }
  };

  /* ── loading state ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteNav />
        <SacredSpinner />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <SiteNav />
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Profile not found.</p>
        </div>
      </div>
    );
  }

  /* ── check visibility ── */
  if (!isOwnProfile && !profile.is_public) {
    return (
      <div className="min-h-screen bg-background">
        <SiteNav />
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <EyeOff className="w-12 h-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">This profile is private.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      {/* ── HERO ── */}
      <section className="relative overflow-hidden pt-20 pb-8">
        {/* gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-background to-background" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/8 rounded-full blur-[120px]" />

        <div className="relative max-w-3xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center text-center"
          >
            {/* avatar */}
            <div className="relative mb-4">
              <div className="absolute -inset-2 bg-gradient-to-br from-primary/30 to-gold/30 rounded-full blur-lg" />
              <Avatar className="relative w-24 h-24 md:w-32 md:h-32 border-4 border-background shadow-lg">
                <AvatarImage src={profile.avatar_url ?? undefined} />
                <AvatarFallback className="text-2xl md:text-3xl font-bold bg-gradient-gold text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {profile.current_streak >= 7 && (
                <motion.div
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center shadow-md"
                >
                  <Flame className="w-4 h-4 text-white" />
                </motion.div>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              {profile.full_name || "Prayer Warrior"}
            </h1>

            <p className="text-xs text-muted-foreground mt-1">
              Member since {new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>

            {/* bio */}
            <div className="mt-4 max-w-lg w-full">
              {editingBio ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-2"
                >
                  <Textarea
                    value={bioDraft}
                    onChange={(e) => setBioDraft(e.target.value)}
                    placeholder="What keeps you praying? Share your heart…"
                    className="min-h-[80px] text-center resize-none"
                    maxLength={500}
                  />
                  <div className="flex justify-center gap-2">
                    <Button size="sm" onClick={saveBio}>
                      <Check className="w-3.5 h-3.5 mr-1" /> Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditingBio(false); setBioDraft(profile.bio ?? ""); }}>
                      <X className="w-3.5 h-3.5 mr-1" /> Cancel
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <div className="group relative">
                  <p className="text-sm text-muted-foreground italic leading-relaxed">
                    {profile.bio || (isOwnProfile ? "Share what keeps you praying…" : "")}
                  </p>
                  {isOwnProfile && (
                    <button
                      onClick={() => setEditingBio(true)}
                      className="mt-1 inline-flex items-center gap-1 text-xs text-primary/60 hover:text-primary transition-colors"
                    >
                      <Edit2 className="w-3 h-3" /> Edit bio
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* action buttons */}
            <div className="flex items-center gap-3 mt-4">
              {isOwnProfile && (
                <div className="flex items-center gap-2 text-xs">
                  <Switch
                    checked={profile.is_public}
                    onCheckedChange={togglePrivacy}
                    className="scale-90"
                  />
                  <span className="text-muted-foreground flex items-center gap-1">
                    {profile.is_public ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    {profile.is_public ? "Public" : "Private"}
                  </span>
                </div>
              )}
              {profile.is_public && (
                <Button size="sm" variant="outline" className="text-xs" onClick={shareProfile}>
                  <Share2 className="w-3.5 h-3.5 mr-1" /> Share
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── MAIN CONTENT ── */}
      <div className="max-w-5xl mx-auto px-4 pb-20 space-y-8">
        {/* ── Stats Dashboard ── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            Prayer Journey
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Current Streak", value: profile.current_streak, icon: Flame, color: "text-orange-500" },
              { label: "Longest Streak", value: profile.longest_streak, icon: Star, color: "text-gold" },
              { label: "Prayers Created", value: stats.totalPrayers, icon: BookOpen, color: "text-primary" },
              { label: "Prayed for Others", value: stats.prayedForOthers, icon: HandHeart, color: "text-emerald-500" },
              { label: "Testimonies", value: stats.testimonies, icon: Sparkles, color: "text-violet-500" },
              { label: "Days Prayed", value: stats.totalDaysPrayed, icon: Calendar, color: "text-sky-500" },
            ].map((s) => (
              <Card key={s.label} className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-4 text-center">
                  <s.icon className={`w-5 h-5 mx-auto mb-1.5 ${s.color}`} />
                  <div className="text-2xl font-bold text-foreground">{s.value}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{s.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* favorite labels */}
          {stats.favoriteLabels.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="text-xs text-muted-foreground mr-1">Favorite topics:</span>
              {stats.favoriteLabels.map((l) => (
                <Badge key={l} variant="secondary" className="text-[10px]">
                  {l}
                </Badge>
              ))}
            </div>
          )}
        </motion.section>

        {/* ── Badges ── */}
        {earnedBadges.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Badges
            </h2>
            <div className="flex flex-wrap gap-3">
              {BADGE_DEFS.filter((b) => earnedBadges.includes(b.key)).map((badge) => (
                <motion.div
                  key={badge.key}
                  whileHover={{ scale: 1.08, y: -2 }}
                  className="group relative"
                >
                  <div className="flex flex-col items-center gap-1 p-3 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm min-w-[80px]">
                    <badge.icon className={`w-6 h-6 ${badge.color}`} />
                    <span className="text-[10px] font-medium text-foreground">{badge.label}</span>
                  </div>
                  {/* tooltip */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap bg-foreground text-background text-[10px] px-2 py-1 rounded-md z-10">
                    {badge.tooltip}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* ── Quick Links (own profile only) ── */}
        {isOwnProfile && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-lg font-semibold text-foreground mb-3">My Sacred Spaces</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { label: "Prayer Board", href: "/board", icon: LayoutDashboard },
                { label: "War Room", href: "/war-room", icon: Swords },
                { label: "Groups", href: "/groups", icon: Users },
                { label: "Family Rooms", href: "/family", icon: Home },
                { label: "Breathe", href: "/breathe", icon: Wind },
                { label: "Testify", href: "/testify", icon: MessageSquareHeart },
                { label: "Circles", href: "/circles", icon: Shield },
                { label: "Sermon Mode", href: "/sermon-sync", icon: Music },
              ].map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  state={link.href === "/family" || link.href === "/circles" ? { from: "profile" } : undefined}
                  className="flex items-center gap-2.5 p-3 rounded-xl border border-border/50 bg-card/30 hover:bg-card/60 transition-colors text-sm text-foreground/80 hover:text-foreground"
                >
                  <link.icon className="w-4 h-4 text-primary/70" />
                  {link.label}
                  <ChevronRight className="w-3.5 h-3.5 ml-auto text-muted-foreground" />
                </Link>
              ))}
            </div>
          </motion.section>
        )}

        {/* ── Activity Feed ── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Prayer Journey
          </h2>
          {activity.length === 0 ? (
            <Card className="border-border/50 bg-card/30">
              <CardContent className="p-8 text-center">
                <Heart className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">
                  {isOwnProfile
                    ? "Your prayer journey begins here. Start by creating a prayer!"
                    : "No public activity yet."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {activity.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.04 * i }}
                >
                  <Card className="border-border/50 bg-card/30 hover:bg-card/50 transition-colors">
                    <CardContent className="p-3 flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">{activityIcon(item.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{item.title}</p>
                        {item.subtitle && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{item.subtitle}</p>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                        {new Date(item.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.section>

        {/* ── Verse ── */}
        <div className="text-center pt-4">
          <VerseLink reference="Hebrews 12:1" />
        </div>
      </div>
    </div>
  );
}
