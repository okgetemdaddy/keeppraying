import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, User, ChevronRight, Heart,
  BookOpen, MessageSquare, Loader2, Sparkles,
} from "lucide-react";
import AIInsightButton from "./AIInsightButton";
import UserDetailPanel from "./UserDetailPanel";

interface UserMetrics {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
  // computed
  prayers_count: number;
  likes_count: number;
  prayed_count: number;
  saved_count: number;
  chat_count: number;
  contact_count: number;
  last_activity: string | null;
}

interface ContactWithUser {
  id: string;
  name: string | null;
  email: string | null;
  message: string;
  created_at: string;
  ai_reply: string | null;
  user_id: string | null;
  user_name: string | null;
}

export default function UserMonitorTab() {
  const { session } = useAuth();
  const [users, setUsers] = useState<UserMetrics[]>([]);
  const [contacts, setContacts] = useState<ContactWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<UserMetrics | null>(null);
  const [activeView, setActiveView] = useState<"users" | "contacts">("users");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [
        { data: profiles },
        { data: prayerCounts },
        { data: likesCounts },
        { data: prayedCounts },
        { data: savedCounts },
        { data: chatCounts },
        { data: contactData },
      ] = await Promise.all([
        supabase.from("profiles").select("id,full_name,email,avatar_url,role,created_at").order("created_at", { ascending: false }),
        supabase.from("prayer_cards").select("created_by").not("created_by", "is", null),
        supabase.from("likes").select("user_id"),
        supabase.from("prayed_actions").select("user_id"),
        supabase.from("user_saved_prayers").select("user_id"),
        supabase.from("ai_chat_logs").select("user_id").not("user_id", "is", null),
        supabase.from("contact_submissions").select("id,name,email,message,created_at,ai_reply").order("created_at", { ascending: false }),
      ]);

      // Build frequency maps
      const freq = (arr: { user_id?: string | null; created_by?: string | null }[], key: "user_id" | "created_by") => {
        const m: Record<string, number> = {};
        (arr || []).forEach(r => { const v = r[key]; if (v) m[v] = (m[v] || 0) + 1; });
        return m;
      };

      const prayerMap = freq(prayerCounts || [], "created_by");
      const likesMap = freq(likesCounts || [], "user_id");
      const prayedMap = freq(prayedCounts || [], "user_id");
      const savedMap = freq(savedCounts || [], "user_id");
      const chatMap = freq(chatCounts || [], "user_id");

      const metrics: UserMetrics[] = (profiles || []).map(p => ({
        ...p,
        prayers_count: prayerMap[p.id] || 0,
        likes_count: likesMap[p.id] || 0,
        prayed_count: prayedMap[p.id] || 0,
        saved_count: savedMap[p.id] || 0,
        chat_count: chatMap[p.id] || 0,
        contact_count: 0,
        last_activity: null,
      }));

      setUsers(metrics);
      setContacts((contactData || []).map(c => ({ ...c, user_id: null, user_name: null })));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q)
    );
  });

  const engagementScore = (u: UserMetrics) =>
    u.prayers_count * 3 + u.likes_count + u.prayed_count * 2 + u.saved_count + u.chat_count * 2;

  const tier = (score: number) => {
    if (score >= 20) return { label: "Champion", color: "text-gold" };
    if (score >= 10) return { label: "Active", color: "text-forest" };
    if (score >= 3) return { label: "Engaged", color: "text-primary" };
    return { label: "New", color: "text-muted-foreground" };
  };

  if (loading) return (
    <div className="flex items-center gap-2 py-8 text-muted-foreground text-sm">
      <Loader2 className="w-4 h-4 animate-spin" /> Loading user metrics…
    </div>
  );

  // ── USER DETAIL VIEW ──
  if (selected) {
    const score = engagementScore(selected);
    const { label, color } = tier(score);
    const data = selected as unknown as Record<string, unknown>;
    return (
      <div className="space-y-5">
        <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />Back to users
        </button>

        <div className="prayer-card p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-divine flex items-center justify-center text-lg font-display font-bold text-foreground flex-shrink-0">
                {selected.avatar_url
                  ? <img src={selected.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                  : (selected.full_name?.[0] || selected.email?.[0] || "?").toUpperCase()
                }
              </div>
              <div>
                <h3 className="font-semibold text-base">{selected.full_name || "Anonymous"}</h3>
                {selected.email && <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{selected.email}</p>}
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant={selected.role === "admin" ? "default" : "secondary"} className="text-xs">{selected.role}</Badge>
                  <span className={`text-xs font-medium ${color}`}>{label} · {score} pts</span>
                </div>
              </div>
            </div>
            {session && (
              <AIInsightButton
                data={data}
                context="user profile"
                accessToken={session.access_token}
              />
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { icon: BookOpen, label: "Prayers", value: selected.prayers_count, color: "text-primary" },
              { icon: Heart, label: "Likes Given", value: selected.likes_count, color: "text-red-400" },
              { icon: HandMetal, label: "Times Prayed", value: selected.prayed_count, color: "text-forest" },
              { icon: Sparkles, label: "AI Chats", value: selected.chat_count, color: "text-gold" },
              { icon: BookOpen, label: "Saved Prayers", value: selected.saved_count, color: "text-primary" },
              { icon: Calendar, label: "Joined", value: new Date(selected.created_at).toLocaleDateString(), color: "text-muted-foreground", isText: true },
            ].map(m => (
              <div key={m.label} className="bg-muted/40 rounded-xl p-3 text-center">
                <m.icon className={`w-4 h-4 mx-auto mb-1 ${m.color}`} />
                <div className="font-display font-bold text-lg">{m.value}</div>
                <div className="text-xs text-muted-foreground">{m.label}</div>
              </div>
            ))}
          </div>

          <div className="border-t border-border pt-3 space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />Member since {new Date(selected.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
            <p className="text-xs text-muted-foreground font-mono">ID: {selected.id}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Sub-tabs */}
      <div className="flex gap-1">
        {(["users", "contacts"] as const).map(v => (
          <button key={v} onClick={() => setActiveView(v)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${activeView === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}>
            {v === "users" ? `Users (${users.length})` : `Contact Forms (${contacts.length})`}
          </button>
        ))}
      </div>

      {/* ── USERS VIEW ── */}
      {activeView === "users" && (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email or user ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 rounded-xl"
            />
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              ["Total Users", users.length],
              ["Champions", users.filter(u => engagementScore(u) >= 20).length],
              ["New (0 activity)", users.filter(u => engagementScore(u) === 0).length],
            ].map(([l, v]) => (
              <div key={String(l)} className="prayer-card p-3 text-center">
                <div className="font-display font-bold text-xl text-primary">{v}</div>
                <div className="text-xs text-muted-foreground">{l}</div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <AnimatePresence>
              {filtered.map((u, i) => {
                const score = engagementScore(u);
                const { label, color } = tier(score);
                return (
                  <motion.div
                    key={u.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="prayer-card p-4 flex items-center gap-3 cursor-pointer hover:border-primary/30 transition-colors group"
                    onClick={() => setSelected(u)}
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-divine flex items-center justify-center font-display font-bold flex-shrink-0 text-sm">
                      {u.avatar_url
                        ? <img src={u.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                        : (u.full_name?.[0] || u.email?.[0] || "?").toUpperCase()
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">{u.full_name || "Anonymous"}</span>
                        <Badge variant={u.role === "admin" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">{u.role}</Badge>
                        <span className={`text-[10px] font-medium ${color}`}>{label}</span>
                      </div>
                      {u.email && <p className="text-xs text-muted-foreground truncate">{u.email}</p>}
                    </div>
                    <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
                      <span className="flex items-center gap-0.5"><BookOpen className="w-3 h-3" />{u.prayers_count}</span>
                      <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" />{u.likes_count}</span>
                      <span className="flex items-center gap-0.5"><MessageSquare className="w-3 h-3" />{u.chat_count}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {session && (
                        <AIInsightButton
                          data={u as unknown as Record<string, unknown>}
                          context="user profile"
                          accessToken={session.access_token}
                          size="sm"
                        />
                      )}
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {filtered.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-8">No users found.</p>
            )}
          </div>
        </>
      )}

      {/* ── CONTACTS VIEW ── */}
      {activeView === "contacts" && (
        <div className="space-y-3">
          {contacts.length === 0 ? (
            <p className="text-muted-foreground text-sm">No contact submissions yet.</p>
          ) : contacts.map(c => (
            <div key={c.id} className="prayer-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {c.name && <span className="font-medium text-sm">{c.name}</span>}
                  {c.user_name && (
                    <Badge variant="secondary" className="text-xs flex items-center gap-1">
                      <User className="w-3 h-3" />{c.user_name}
                    </Badge>
                  )}
                  {c.email && <span className="text-xs text-muted-foreground">{c.email}</span>}
                  <span className="text-xs text-muted-foreground ml-auto">{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
                {session && (
                  <AIInsightButton
                    data={c as unknown as Record<string, unknown>}
                    context="contact submission"
                    accessToken={session.access_token}
                    size="sm"
                  />
                )}
              </div>
              <div className="bg-muted/40 rounded-xl px-3 py-2">
                <p className="text-xs text-muted-foreground mb-1 font-medium">Message</p>
                <p className="text-sm text-foreground/80">{c.message}</p>
              </div>
              {c.ai_reply && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl px-3 py-2">
                  <p className="text-xs text-primary font-medium mb-1 flex items-center gap-1"><Sparkles className="w-3 h-3" />AI Reply</p>
                  <p className="text-sm text-foreground/80 whitespace-pre-line">{c.ai_reply}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
