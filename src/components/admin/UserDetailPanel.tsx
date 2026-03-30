import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  ArrowLeft, Heart, HandMetal, BookOpen, MessageSquare,
  Clock, Calendar, Mail, Sparkles, Eye, LogIn, Search,
  MousePointerClick, Timer, Loader2, Globe, Highlighter,
  StickyNote, Bookmark,
} from "lucide-react";
import AIInsightButton from "./AIInsightButton";

interface UserMetrics {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
  prayers_count: number;
  likes_count: number;
  prayed_count: number;
  saved_count: number;
  chat_count: number;
  contact_count: number;
  last_activity: string | null;
}

interface ActivityStats {
  page_views: number;
  logins: number;
  searches: number;
  feature_uses: number;
  button_clicks: number;
  prayer_card_views: number;
  sessions: number;
  avg_session_minutes: number;
  last_seen: string | null;
  top_pages: { path: string; count: number }[];
  highlights_count: number;
  notes_count: number;
  bookmarks_count: number;
}

interface Props {
  user: UserMetrics;
  accessToken: string | null;
  onBack: () => void;
}

const engagementScore = (u: UserMetrics) =>
  u.prayers_count * 3 + u.likes_count + u.prayed_count * 2 + u.saved_count + u.chat_count * 2;

const tier = (score: number) => {
  if (score >= 20) return { label: "Champion", color: "text-gold" };
  if (score >= 10) return { label: "Active", color: "text-forest" };
  if (score >= 3) return { label: "Engaged", color: "text-primary" };
  return { label: "New", color: "text-muted-foreground" };
};

export default function UserDetailPanel({ user, accessToken, onBack }: Props) {
  const [activityStats, setActivityStats] = useState<ActivityStats | null>(null);
  const [loadingActivity, setLoadingActivity] = useState(true);

  useEffect(() => {
    async function loadActivity() {
      setLoadingActivity(true);
      try {
        const [
          { data: activityLogs },
          { data: highlights },
          { data: notes },
          { data: bookmarks },
        ] = await Promise.all([
          (supabase.from("user_activity_log") as any)
            .select("activity_type,activity_data,page_path,created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1000),
          supabase.from("user_highlights").select("id").eq("user_id", user.id),
          supabase.from("user_notes").select("id").eq("user_id", user.id),
          supabase.from("user_bookmarks").select("id").eq("user_id", user.id),
        ]);

        const logs = activityLogs || [];
        const pageViews = logs.filter((l: any) => l.activity_type === "page_view");
        const sessions = logs.filter((l: any) => l.activity_type === "session_end");
        const totalDuration = sessions.reduce((sum: number, s: any) => {
          return sum + (s.activity_data?.duration_ms || 0);
        }, 0);

        // Top pages
        const pageCounts: Record<string, number> = {};
        pageViews.forEach((l: any) => {
          const p = l.page_path || l.activity_data?.path || "/";
          pageCounts[p] = (pageCounts[p] || 0) + 1;
        });
        const topPages = Object.entries(pageCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([path, count]) => ({ path, count }));

        setActivityStats({
          page_views: pageViews.length,
          logins: logs.filter((l: any) => l.activity_type === "login" || l.activity_type === "session_start").length,
          searches: logs.filter((l: any) => l.activity_type === "search").length,
          feature_uses: logs.filter((l: any) => l.activity_type === "feature_use").length,
          button_clicks: logs.filter((l: any) => l.activity_type === "button_click").length,
          prayer_card_views: logs.filter((l: any) => l.activity_type === "prayer_card_view").length,
          sessions: sessions.length,
          avg_session_minutes: sessions.length > 0
            ? Math.round(totalDuration / sessions.length / 60000)
            : 0,
          last_seen: logs.length > 0 ? logs[0].created_at : null,
          top_pages: topPages,
          highlights_count: highlights?.length || 0,
          notes_count: notes?.length || 0,
          bookmarks_count: bookmarks?.length || 0,
        });
      } finally {
        setLoadingActivity(false);
      }
    }
    loadActivity();
  }, [user.id]);

  const score = engagementScore(user);
  const { label, color } = tier(score);

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" />Back to users
      </button>

      {/* Profile card */}
      <div className="prayer-card p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-divine flex items-center justify-center text-lg font-display font-bold text-foreground flex-shrink-0">
              {user.avatar_url
                ? <img src={user.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                : (user.full_name?.[0] || user.email?.[0] || "?").toUpperCase()
              }
            </div>
            <div>
              <h3 className="font-semibold text-base">{user.full_name || "Anonymous"}</h3>
              {user.email && <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{user.email}</p>}
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant={user.role === "admin" ? "default" : "secondary"} className="text-xs">{user.role}</Badge>
                <span className={`text-xs font-medium ${color}`}>{label} · {score} pts</span>
              </div>
            </div>
          </div>
          {accessToken && (
            <AIInsightButton
              data={user as unknown as Record<string, unknown>}
              context="user profile"
              accessToken={accessToken}
            />
          )}
        </div>

        {/* Faith Activity Stats */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Faith Activity</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { icon: BookOpen, label: "Prayers", value: user.prayers_count, color: "text-primary" },
              { icon: Heart, label: "Likes Given", value: user.likes_count, color: "text-red-400" },
              { icon: HandMetal, label: "Times Prayed", value: user.prayed_count, color: "text-forest" },
              { icon: Sparkles, label: "AI Chats", value: user.chat_count, color: "text-gold" },
              { icon: BookOpen, label: "Saved Prayers", value: user.saved_count, color: "text-primary" },
              { icon: Calendar, label: "Joined", value: new Date(user.created_at).toLocaleDateString(), color: "text-muted-foreground", isText: true },
            ].map(m => (
              <div key={m.label} className="bg-muted/40 rounded-xl p-3 text-center">
                <m.icon className={`w-4 h-4 mx-auto mb-1 ${m.color}`} />
                <div className="font-display font-bold text-lg">{m.value}</div>
                <div className="text-xs text-muted-foreground">{m.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bible Activity */}
        {activityStats && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Bible Activity</h4>
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Highlighter, label: "Highlights", value: activityStats.highlights_count, color: "text-yellow-500" },
                { icon: StickyNote, label: "Notes", value: activityStats.notes_count, color: "text-blue-400" },
                { icon: Bookmark, label: "Bookmarks", value: activityStats.bookmarks_count, color: "text-primary" },
              ].map(m => (
                <div key={m.label} className="bg-muted/40 rounded-xl p-3 text-center">
                  <m.icon className={`w-4 h-4 mx-auto mb-1 ${m.color}`} />
                  <div className="font-display font-bold text-lg">{m.value}</div>
                  <div className="text-xs text-muted-foreground">{m.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Engagement & Usage Stats */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Engagement & Usage
          </h4>
          {loadingActivity ? (
            <div className="flex items-center gap-2 text-muted-foreground text-xs py-4">
              <Loader2 className="w-3 h-3 animate-spin" /> Loading activity data…
            </div>
          ) : activityStats ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { icon: Eye, label: "Page Views", value: activityStats.page_views, color: "text-blue-400" },
                  { icon: LogIn, label: "Sessions", value: activityStats.logins, color: "text-green-400" },
                  { icon: Search, label: "Searches", value: activityStats.searches, color: "text-orange-400" },
                  { icon: MousePointerClick, label: "Feature Uses", value: activityStats.feature_uses, color: "text-purple-400" },
                  { icon: Eye, label: "Card Views", value: activityStats.prayer_card_views, color: "text-primary" },
                  { icon: Timer, label: "Avg Session", value: `${activityStats.avg_session_minutes}m`, color: "text-muted-foreground", isText: true },
                ].map(m => (
                  <div key={m.label} className="bg-muted/40 rounded-xl p-3 text-center">
                    <m.icon className={`w-4 h-4 mx-auto mb-1 ${m.color}`} />
                    <div className="font-display font-bold text-lg">{m.value}</div>
                    <div className="text-xs text-muted-foreground">{m.label}</div>
                  </div>
                ))}
              </div>

              {/* Top Pages */}
              {activityStats.top_pages.length > 0 && (
                <div className="bg-muted/40 rounded-xl p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <Globe className="w-3 h-3" /> Most Visited Pages
                  </p>
                  <div className="space-y-1">
                    {activityStats.top_pages.map(p => (
                      <div key={p.path} className="flex items-center justify-between text-xs">
                        <span className="text-foreground/80 font-mono truncate max-w-[200px]">{p.path}</span>
                        <span className="text-muted-foreground font-medium">{p.count} views</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activityStats.last_seen && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Last seen {new Date(activityStats.last_seen).toLocaleString()}
                </p>
              )}
            </motion.div>
          ) : (
            <p className="text-xs text-muted-foreground py-2">No activity data yet.</p>
          )}
        </div>

        <div className="border-t border-border pt-3 space-y-1">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />Member since {new Date(user.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
          <p className="text-xs text-muted-foreground font-mono">ID: {user.id}</p>
        </div>
      </div>
    </div>
  );
}
