import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, AreaChart, Area } from "recharts";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Check, X, Loader2, RefreshCw, Users, BookOpen, Mail,
  BarChart2, FileText, PlusCircle, Eye, EyeOff, Sparkles, BookMarked, Search, ScrollText,
  Pencil, Save, XCircle, Scroll, Trash2, Shield, Activity, Settings, LayoutDashboard,
  ChevronRight, TrendingUp, Heart, MessageSquare, Star, Bell, LogOut, Menu, ChevronDown,
  BookText, Flag, Flame, Crown, Wind,
} from "lucide-react";
import AIInsightsTab from "@/components/admin/AIInsightsTab";
import UserMonitorTab from "@/components/admin/UserMonitorTab";
import AIEnrichPanel from "@/components/AIEnrichPanel";
import PrayerRequestsInbox from "@/components/admin/PrayerRequestsInbox";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const TEXT_STYLES = [
  { value: "classic", label: "Classic" },
  { value: "serif", label: "Serif" },
  { value: "script", label: "Script" },
  { value: "bold", label: "Bold" },
  { value: "light", label: "Light" },
  { value: "italic", label: "Italic" },
  { value: "gold", label: "Gold" },
  { value: "shadow", label: "Shadow" },
  { value: "outline", label: "Outline" },
  { value: "minimal", label: "Minimal" },
];

const blogSchema = z.object({
  title: z.string().min(3, "Title required"),
  slug: z.string().min(3, "Slug required").regex(/^[a-z0-9-]+$/, "Slug must be lowercase with hyphens only"),
  excerpt: z.string().max(300).optional(),
  content: z.string().min(10, "Content required"),
  cover_image_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  published: z.boolean().default(false),
});
type BlogFormValues = z.infer<typeof blogSchema>;

const prayerCardSchema = z.object({
  title: z.string().max(100).optional(),
  prayer_text: z.string().min(10, "Prayer text required").max(5000),
  extended_prayer: z.string().max(5000).optional(),
  labels: z.string().optional(),
  text_style: z.string().default("classic"),
  background_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});
type PrayerCardFormValues = z.infer<typeof prayerCardSchema>;

interface PrayerStat { id: string; title: string | null; prayer_text: string; likes_count: number; prayed_count: number; views: number; }
interface ContactSubmission { id: string; name: string | null; email: string | null; message: string; created_at: string; ai_reply: string | null; replied_at: string | null; }
interface AdminReport { id: string; title: string; content: string; generated_at: string; }
interface BlogPost { id: string; title: string; slug: string; excerpt: string | null; published: boolean | null; created_at: string; }
interface VerseSummary { id: string; reference: string; verse_text: string | null; summary: string | null; exegesis: string | null; created_at: string; }

type TabId = "overview" | "moderation" | "prayers" | "breath" | "users" | "contacts" | "blog" | "faq" | "insights" | "verses" | "testimonies" | "prayer-requests" | "feedback";

const NAV_ITEMS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "overview",         label: "Overview",          icon: LayoutDashboard },
  { id: "moderation",       label: "Review Queue",      icon: Shield },
  { id: "prayer-requests",  label: "Prayer Requests",   icon: Heart },
  { id: "feedback",         label: "Feedback",          icon: MessageSquare },
  { id: "users",            label: "User Management",   icon: Users },
  { id: "insights",         label: "Analytics",         icon: BarChart2 },
  { id: "testimonies",      label: "Moderation Log",    icon: Flag },
  { id: "prayers",          label: "Prayers",           icon: Scroll },
  { id: "blog",             label: "KeepGrow.ing",      icon: BookOpen },
  { id: "verses",           label: "Verses",            icon: BookMarked },
  { id: "faq",              label: "FAQ Report",        icon: FileText },
  { id: "contacts",         label: "Contact",           icon: Mail },
];

export default function Admin() {
  const { user, session } = useAuth();
  const [pending, setPending] = useState<{ id: string; title: string | null; prayer_text: string; created_at: string }[]>([]);
  const [stats, setStats] = useState({ total: 0, approved: 0, pending: 0, testimonies: 0, users: 0 });
  const [topLiked, setTopLiked] = useState<PrayerStat[]>([]);
  const [topPrayed, setTopPrayed] = useState<PrayerStat[]>([]);
  const [signupData, setSignupData] = useState<{ date: string; count: number }[]>([]);
  const [contacts, setContacts] = useState<ContactSubmission[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [verseSummaries, setVerseSummaries] = useState<VerseSummary[]>([]);
  const [verseSearch, setVerseSearch] = useState("");
  const [verseSearching, setVerseSearching] = useState(false);
  const [genFaq, setGenFaq] = useState(false);
  const [showBlogForm, setShowBlogForm] = useState(false);
  const [showPrayerForm, setShowPrayerForm] = useState(false);
  const [savingPrayer, setSavingPrayer] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { toast } = useToast();
  const [enrichCardId, setEnrichCardId] = useState<string | null>(null);
  const [enrichCardText, setEnrichCardText] = useState("");
  const [enrichCardExtended, setEnrichCardExtended] = useState<string | null>(null);
  const [enrichOpen, setEnrichOpen] = useState(false);
  const [editingVerseId, setEditingVerseId] = useState<string | null>(null);
  const [editingVerse, setEditingVerse] = useState<Partial<VerseSummary>>({});
  const [savingVerse, setSavingVerse] = useState(false);

  const blogForm = useForm<BlogFormValues>({
    resolver: zodResolver(blogSchema),
    defaultValues: { title: "", slug: "", excerpt: "", content: "", cover_image_url: "", published: false },
  });

  const prayerForm = useForm<PrayerCardFormValues>({
    resolver: zodResolver(prayerCardSchema),
    defaultValues: { title: "", prayer_text: "", extended_prayer: "", labels: "", text_style: "classic", background_url: "" },
  });

  const load = useCallback(async () => {
    const [
      { data: p },
      { count: total },
      { count: approved },
      { count: pend },
      { count: testimonyCount },
      { count: userCount },
      { data: liked },
      { data: prayed },
      { data: profiles },
      { data: contactData },
      { data: reportData },
      { data: blogData },
    ] = await Promise.all([
      supabase.from("prayer_cards").select("id,title,prayer_text,created_at").eq("status", "pending").order("created_at", { ascending: false }),
      supabase.from("prayer_cards").select("*", { count: "exact", head: true }),
      supabase.from("prayer_cards").select("*", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("prayer_cards").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("testimonies").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("prayer_cards").select("id,title,prayer_text,likes_count,prayed_count,views").order("likes_count", { ascending: false }).limit(5),
      supabase.from("prayer_cards").select("id,title,prayer_text,likes_count,prayed_count,views").order("prayed_count", { ascending: false }).limit(5),
      supabase.from("profiles").select("created_at").order("created_at", { ascending: true }),
      supabase.from("contact_submissions").select("*").order("created_at", { ascending: false }),
      supabase.from("admin_reports").select("*").order("generated_at", { ascending: false }).limit(5),
      supabase.from("blog_posts").select("id,title,slug,excerpt,published,created_at").order("created_at", { ascending: false }),
    ]);

    setPending(p || []);
    setStats({ total: total || 0, approved: approved || 0, pending: pend || 0, testimonies: testimonyCount || 0, users: userCount || 0 });
    setTopLiked((liked as PrayerStat[]) || []);
    setTopPrayed((prayed as PrayerStat[]) || []);
    setContacts((contactData as ContactSubmission[]) || []);
    setReports((reportData as AdminReport[]) || []);
    setBlogPosts((blogData as BlogPost[]) || []);

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recent = (profiles || []).filter(p => new Date(p.created_at) >= thirtyDaysAgo);
    const grouped: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
      grouped[d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })] = 0;
    }
    recent.forEach(p => {
      const key = new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (grouped[key] !== undefined) grouped[key]++;
    });
    setSignupData(Object.entries(grouped).slice(-14).map(([date, count]) => ({ date, count })));
  }, []);

  useEffect(() => { load(); }, [load]);

  const review = async (id: string, action: "approved" | "rejected") => {
    await supabase.from("prayer_cards").update({ status: action }).eq("id", id);
    setPending(prev => prev.filter(p => p.id !== id));
    toast({ title: action === "approved" ? "Prayer approved ✓" : "Prayer rejected" });
  };

  const generateFaq = async () => {
    if (!session) return;
    setGenFaq(true);
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/faq-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({}),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed to generate report");
      toast({ title: "FAQ report generated! 📊" });
      load();
    } catch (e) {
      toast({ title: "Failed to generate FAQ", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    } finally {
      setGenFaq(false);
    }
  };

  const onBlogSubmit = async (values: BlogFormValues) => {
    const { error } = await supabase.from("blog_posts").insert({
      title: values.title, slug: values.slug, excerpt: values.excerpt || null,
      content: values.content, cover_image_url: values.cover_image_url || null,
      published: values.published, author_id: user?.id || null,
    });
    if (error) { toast({ title: "Failed to save post", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Blog post saved! 📝" });
    blogForm.reset(); setShowBlogForm(false); load();
  };

  const togglePublish = async (id: string, current: boolean | null) => {
    await supabase.from("blog_posts").update({ published: !current }).eq("id", id);
    load();
  };

  const onPrayerCardSubmit = async (values: PrayerCardFormValues) => {
    if (!user) return;
    setSavingPrayer(true);
    try {
      const labelsArr = values.labels ? values.labels.split(",").map(t => t.trim().toLowerCase().replace(/\s+/g, "-")).filter(Boolean) : [];
      const { data: newCard, error } = await supabase.from("prayer_cards").insert({
        title: values.title || null, prayer_text: values.prayer_text.trim(),
        extended_prayer: values.extended_prayer?.trim() || null,
        labels: labelsArr.length ? labelsArr : null, text_style: values.text_style,
        background_url: values.background_url || null,
        created_by: user.id, source: "admin", status: "approved",
      }).select("id").single();
      if (error) throw error;
      toast({ title: "Prayer card published! 🙏" });
      prayerForm.reset(); setShowPrayerForm(false); load();
      if (newCard?.id) {
        setEnrichCardId(newCard.id); setEnrichCardText(values.prayer_text.trim());
        setEnrichCardExtended(values.extended_prayer?.trim() || null); setEnrichOpen(true);
      }
    } catch (e) {
      toast({ title: "Failed to save prayer", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    } finally { setSavingPrayer(false); }
  };

  const saveVerseEdit = async () => {
    if (!editingVerseId) return;
    setSavingVerse(true);
    try {
      const { error } = await supabase.from("verse_summaries").update({
        reference: editingVerse.reference, verse_text: editingVerse.verse_text ?? null,
        summary: editingVerse.summary ?? null, exegesis: editingVerse.exegesis ?? null,
      }).eq("id", editingVerseId);
      if (error) throw error;
      toast({ title: "Verse saved ✓" });
      setEditingVerseId(null); setEditingVerse({}); loadVerses(verseSearch);
    } catch (e) {
      toast({ title: "Save failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    } finally { setSavingVerse(false); }
  };

  const loadVerses = useCallback(async (search = "") => {
    setVerseSearching(true);
    try {
      let q = supabase.from("verse_summaries").select("*").order("created_at", { ascending: false }).limit(50);
      if (search.trim()) q = q.or(`reference.ilike.%${search}%,summary.ilike.%${search}%,exegesis.ilike.%${search}%`);
      const { data } = await q;
      setVerseSummaries((data as VerseSummary[]) || []);
    } finally { setVerseSearching(false); }
  }, []);

  useEffect(() => { if (activeTab === "verses") loadVerses(); }, [activeTab, loadVerses]);

  // ─── RENDER ─────────────────────────────────────────────────────────────
  return (
    <>
    {/* Force dark mode for the entire admin shell */}
    <div className="dark min-h-screen flex w-full" style={{ background: "hsl(220 35% 5%)", color: "hsl(38 28% 92%)" }}>

      {/* ── SIDEBAR ── */}
      <aside
        className={`flex-shrink-0 flex flex-col transition-all duration-300 border-r relative z-20`}
        style={{
          width: sidebarOpen ? "220px" : "60px",
          background: "hsl(220 32% 7%)",
          borderColor: "hsl(220 26% 13%)",
          minHeight: "100vh",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-3 py-5 border-b" style={{ borderColor: "hsl(220 26% 13%)" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, hsl(42 85% 46%), hsl(35 82% 54%))" }}>
            <Shield className="w-4 h-4 text-white" />
          </div>
          {sidebarOpen && (
            <div>
              <p className="text-xs font-bold leading-none" style={{ color: "hsl(42 85% 58%)" }}>Guardian Portal</p>
              <p className="text-[10px] mt-0.5" style={{ color: "hsl(38 14% 50%)" }}>Sacred Admin</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-0.5 px-2 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-left transition-all duration-150 group relative"
                style={{
                  background: isActive ? "hsl(42 85% 46% / 0.15)" : "transparent",
                  color: isActive ? "hsl(42 85% 58%)" : "hsl(38 14% 55%)",
                  borderLeft: isActive ? "2px solid hsl(42 85% 46%)" : "2px solid transparent",
                }}
                title={!sidebarOpen ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 transition-colors ${isActive ? "" : "group-hover:text-foreground"}`} />
                {sidebarOpen && (
                  <span className="text-xs font-medium truncate">{item.label}</span>
                )}
                {item.id === "moderation" && pending.length > 0 && (
                  <span className="ml-auto w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center flex-shrink-0"
                    style={{ background: "hsl(0 72% 51%)", color: "white" }}>
                    {pending.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t space-y-1" style={{ borderColor: "hsl(220 26% 13%)" }}>
          <Link to="/"
            className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-xs transition-colors"
            style={{ color: "hsl(38 14% 50%)" }}
          >
            <ArrowLeft className="w-4 h-4 flex-shrink-0" />
            {sidebarOpen && <span>Back to Site</span>}
          </Link>
        </div>
      </aside>

      {/* ── MAIN AREA ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top header */}
        <header className="flex items-center gap-4 px-6 py-4 border-b flex-shrink-0"
          style={{ background: "hsl(220 32% 7%)", borderColor: "hsl(220 26% 13%)" }}>
          <button onClick={() => setSidebarOpen(v => !v)}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/5">
            <Menu className="w-5 h-5" style={{ color: "hsl(38 14% 55%)" }} />
          </button>

          <div>
            <h1 className="font-display text-lg font-bold leading-none" style={{ color: "hsl(38 28% 92%)" }}>
              {NAV_ITEMS.find(n => n.id === activeTab)?.label ?? "Admin"}
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "hsl(38 14% 50%)" }}>
              KeepPray.ing · Guardian Portal
            </p>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {/* Status pill */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
              style={{ background: "hsl(150 38% 26% / 0.25)", color: "hsl(150 38% 65%)", border: "1px solid hsl(150 38% 26% / 0.4)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              System Divine
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
              style={{ background: "linear-gradient(135deg, hsl(42 85% 46%), hsl(35 82% 54%)", color: "white" }}>
              {user?.email?.[0]?.toUpperCase() ?? "A"}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}>

              {/* ── OVERVIEW ── */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Hero title */}
                  <div>
                    <h2 className="font-display text-3xl font-bold" style={{ color: "hsl(38 28% 92%)" }}>The Altar Overview</h2>
                    <p className="text-sm mt-1" style={{ color: "hsl(38 14% 50%)" }}>
                      Witness the growth of the collective spirit and the rising tide of global devotion.
                    </p>
                  </div>

                  {/* Metrics row */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    {[
                      { label: "Total Users", value: stats.users, icon: Users, color: "hsl(42 85% 58%)" },
                      { label: "Active Warriors", value: stats.approved, icon: Flame, color: "hsl(42 85% 58%)" },
                      { label: "Total Prayers", value: stats.total, icon: Scroll, color: "hsl(42 85% 58%)" },
                      { label: "Testimonies", value: stats.testimonies, icon: Star, color: "hsl(42 85% 58%)" },
                      { label: "Pending Review", value: stats.pending, icon: Shield, color: pending.length > 0 ? "hsl(0 72% 60%)" : "hsl(42 85% 58%)" },
                    ].map((m, i) => (
                      <motion.div key={m.label}
                        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                        className="rounded-xl p-4 space-y-2"
                        style={{ background: "hsl(220 32% 10%)", border: "1px solid hsl(220 26% 15%)" }}>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "hsl(38 14% 50%)" }}>{m.label}</span>
                          <m.icon className="w-3.5 h-3.5" style={{ color: m.color }} />
                        </div>
                        <div className="font-display text-2xl font-bold" style={{ color: m.color }}>{m.value.toLocaleString()}</div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Charts row */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* User Growth — takes 2 cols */}
                    <div className="lg:col-span-2 rounded-xl p-5"
                      style={{ background: "hsl(220 32% 10%)", border: "1px solid hsl(220 26% 15%)" }}>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-sm font-semibold" style={{ color: "hsl(38 28% 88%)" }}>User Growth</h3>
                          <p className="text-xs mt-0.5" style={{ color: "hsl(38 14% 50%)" }}>Congregation expansion over time</p>
                        </div>
                        <TrendingUp className="w-4 h-4" style={{ color: "hsl(42 85% 58%)" }} />
                      </div>
                      <ResponsiveContainer width="100%" height={180}>
                        <AreaChart data={signupData}>
                          <defs>
                            <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(42, 85%, 46%)" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="hsl(42, 85%, 46%)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 26%, 17%)" />
                          <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(38, 14%, 45%)" }} axisLine={false} tickLine={false} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: "hsl(38, 14%, 45%)" }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ background: "hsl(220,32%,13%)", border: "1px solid hsl(220,26%,18%)", borderRadius: "0.5rem", fontSize: "11px", color: "hsl(38,28%,88%)" }} />
                          <Area type="monotone" dataKey="count" stroke="hsl(42,85%,46%)" strokeWidth={2} fill="url(#goldGrad)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Sacred Pulse / Activity feed */}
                    <div className="rounded-xl p-5"
                      style={{ background: "hsl(220 32% 10%)", border: "1px solid hsl(220 26% 15%)" }}>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold" style={{ color: "hsl(38 28% 88%)" }}>Sacred Pulse</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "hsl(0 72% 51% / 0.2)", color: "hsl(0 72% 65%)" }}>Live Now</span>
                      </div>
                      <div className="space-y-3">
                        {pending.slice(0, 4).map((p, i) => (
                          <div key={p.id} className="flex items-start gap-2">
                            <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                              style={{ background: `hsl(${220 + i * 15} 32% 18%)`, color: "hsl(42 85% 58%)" }}>
                              {i + 1}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium leading-tight line-clamp-2" style={{ color: "hsl(38 28% 80%)" }}>
                                {p.title || p.prayer_text.slice(0, 60)}
                              </p>
                              <p className="text-[10px] mt-0.5" style={{ color: "hsl(38 14% 45%)" }}>
                                {new Date(p.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))}
                        {pending.length === 0 && (
                          <p className="text-xs text-center py-4" style={{ color: "hsl(38 14% 45%)" }}>All prayers reviewed 🙏</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Prayer Activity charts */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="rounded-xl p-5"
                      style={{ background: "hsl(220 32% 10%)", border: "1px solid hsl(220 26% 15%)" }}>
                      <h3 className="text-sm font-semibold mb-4" style={{ color: "hsl(38 28% 88%)" }}>Prayer Activity — Top Liked</h3>
                      <ResponsiveContainer width="100%" height={160}>
                        <BarChart data={topLiked.map(p => ({ name: (p.title || p.prayer_text).slice(0, 14) + "…", value: p.likes_count }))}>
                          <XAxis dataKey="name" tick={{ fontSize: 8, fill: "hsl(38,14%,45%)" }} axisLine={false} tickLine={false} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 8, fill: "hsl(38,14%,45%)" }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ background: "hsl(220,32%,13%)", border: "1px solid hsl(220,26%,18%)", borderRadius: "0.5rem", fontSize: "11px", color: "hsl(38,28%,88%)" }} />
                          <Bar dataKey="value" fill="hsl(42,85%,46%)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="rounded-xl p-5"
                      style={{ background: "hsl(220 32% 10%)", border: "1px solid hsl(220 26% 15%)" }}>
                      <h3 className="text-sm font-semibold mb-4" style={{ color: "hsl(38 28% 88%)" }}>Prayer Activity — Most Prayed</h3>
                      <ResponsiveContainer width="100%" height={160}>
                        <BarChart data={topPrayed.map(p => ({ name: (p.title || p.prayer_text).slice(0, 14) + "…", value: p.prayed_count }))}>
                          <XAxis dataKey="name" tick={{ fontSize: 8, fill: "hsl(38,14%,45%)" }} axisLine={false} tickLine={false} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 8, fill: "hsl(38,14%,45%)" }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ background: "hsl(220,32%,13%)", border: "1px solid hsl(220,26%,18%)", borderRadius: "0.5rem", fontSize: "11px", color: "hsl(38,28%,88%)" }} />
                          <Bar dataKey="value" fill="hsl(150,38%,35%)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Quick action footer */}
                  <div className="rounded-xl px-5 py-4 flex items-center gap-6 flex-wrap"
                    style={{ background: "hsl(220 32% 10%)", border: "1px solid hsl(220 26% 15%)" }}>
                    <span className="text-xs" style={{ color: "hsl(38 14% 50%)" }}>Quick actions</span>
                    <button onClick={() => setActiveTab("moderation")}
                      className="text-xs flex items-center gap-1.5 transition-colors hover:opacity-80"
                      style={{ color: "hsl(42 85% 58%)" }}>
                      <Shield className="w-3.5 h-3.5" />Review Queue ({pending.length})
                    </button>
                    <button onClick={() => setActiveTab("users")}
                      className="text-xs flex items-center gap-1.5 transition-colors hover:opacity-80"
                      style={{ color: "hsl(42 85% 58%)" }}>
                      <Users className="w-3.5 h-3.5" />Manage Users
                    </button>
                    <button onClick={() => setActiveTab("prayers")}
                      className="text-xs flex items-center gap-1.5 transition-colors hover:opacity-80"
                      style={{ color: "hsl(42 85% 58%)" }}>
                      <PlusCircle className="w-3.5 h-3.5" />New Prayer
                    </button>
                  </div>
                </div>
              )}

              {/* ── REVIEW QUEUE (Sacred Review) ── */}
              {activeTab === "moderation" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <h2 className="font-display text-2xl font-bold" style={{ color: "hsl(38 28% 92%)" }}>
                        ✦ Moderation Sanctuary
                      </h2>
                      <p className="text-xs mt-1" style={{ color: "hsl(38 14% 50%)" }}>
                        {pending.length} Pending Reviews — Curating the divine digital altar
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <GoldButton onClick={() => setShowPrayerForm(v => !v)}>
                        <PlusCircle className="w-4 h-4" />
                        {showPrayerForm ? "Cancel" : "New Prayer"}
                      </GoldButton>
                      <DarkOutlineButton onClick={load}>
                        <RefreshCw className="w-4 h-4" />
                      </DarkOutlineButton>
                    </div>
                  </div>

                  {showPrayerForm && (
                    <GuardianCard>
                      <p className="text-xs mb-4" style={{ color: "hsl(42 85% 58%)" }}>
                        Cards created here are automatically published as <strong>Curated (Admin)</strong> and visible immediately.
                      </p>
                      <Form {...prayerForm}>
                        <form onSubmit={prayerForm.handleSubmit(onPrayerCardSubmit)} className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <FormField control={prayerForm.control} name="title" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs" style={{ color: "hsl(38 14% 55%)" }}>Title (optional)</FormLabel>
                                <FormControl><DarkInput {...field} placeholder="e.g. Morning Surrender" /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={prayerForm.control} name="text_style" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs" style={{ color: "hsl(38 14% 55%)" }}>Text Style</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="rounded-xl text-sm dark-select" style={{ background: "hsl(220 26% 14%)", border: "1px solid hsl(220 26% 20%)", color: "hsl(38 28% 88%)" }}>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent style={{ background: "hsl(220 32% 12%)", border: "1px solid hsl(220 26% 18%)" }}>
                                    {TEXT_STYLES.map(s => <SelectItem key={s.value} value={s.value} style={{ color: "hsl(38 28% 88%)" }}>{s.label}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )} />
                          </div>
                          <FormField control={prayerForm.control} name="prayer_text" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs" style={{ color: "hsl(38 14% 55%)" }}>Prayer Text <span style={{ color: "hsl(0 72% 60%)" }}>*</span></FormLabel>
                              <FormControl><DarkTextarea {...field} placeholder="Write the prayer…" rows={5} maxLength={5000} /></FormControl>
                              <p className="text-xs text-right mt-0.5" style={{ color: "hsl(38 14% 45%)" }}>{field.value?.length ?? 0}/5000</p>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={prayerForm.control} name="extended_prayer" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs" style={{ color: "hsl(38 14% 55%)" }}>Scripture / Extended Prayer (optional)</FormLabel>
                              <FormControl><DarkTextarea {...field} placeholder="Related scripture… (e.g. John 3:16)" rows={3} maxLength={5000} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <FormField control={prayerForm.control} name="labels" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs" style={{ color: "hsl(38 14% 55%)" }}>Labels (comma-separated)</FormLabel>
                                <FormControl><DarkInput {...field} placeholder="peace, healing, faith" /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={prayerForm.control} name="background_url" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs" style={{ color: "hsl(38 14% 55%)" }}>Background Image URL</FormLabel>
                                <FormControl><DarkInput {...field} placeholder="https://…" /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                          </div>
                          <div className="flex gap-2 pt-1">
                            <GoldButton type="submit" disabled={savingPrayer}>
                              {savingPrayer ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScrollText className="w-4 h-4" />}
                              Publish Prayer Card
                            </GoldButton>
                            <DarkOutlineButton type="button" onClick={() => { setShowPrayerForm(false); prayerForm.reset(); }}>Cancel</DarkOutlineButton>
                          </div>
                        </form>
                      </Form>
                    </GuardianCard>
                  )}

                  {/* Filter bar */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs px-3 py-1.5 rounded-full font-medium" style={{ background: "hsl(42 85% 46% / 0.15)", color: "hsl(42 85% 58%)", border: "1px solid hsl(42 85% 46% / 0.3)" }}>
                      All Pending
                    </span>
                    <span className="text-xs" style={{ color: "hsl(38 14% 45%)" }}>All Topics</span>
                    <span className="text-xs" style={{ color: "hsl(38 14% 45%)" }}>Last 24 Hours</span>
                  </div>

                  {pending.length === 0 ? (
                    <GuardianCard>
                      <p className="text-center py-6 text-sm" style={{ color: "hsl(38 14% 50%)" }}>No prayers pending review 🙏</p>
                    </GuardianCard>
                  ) : (
                    <div className="space-y-3">
                      {pending.map((p, i) => (
                        <motion.div key={p.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                          <GuardianCard>
                            <div className="flex items-start gap-3">
                              <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold"
                                style={{ background: "hsl(220 26% 18%)", color: "hsl(42 85% 58%)" }}>
                                {(p.title || p.prayer_text)[0]?.toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                {p.title && <p className="font-semibold text-sm mb-1" style={{ color: "hsl(38 28% 90%)" }}>{p.title}</p>}
                                <p className="text-sm leading-relaxed line-clamp-3" style={{ color: "hsl(38 20% 70%)" }}>{p.prayer_text}</p>
                                <div className="flex items-center gap-3 mt-2 flex-wrap">
                                  <span className="text-[10px]" style={{ color: "hsl(38 14% 45%)" }}>{new Date(p.created_at).toLocaleDateString()}</span>
                                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "hsl(150 38% 26% / 0.25)", color: "hsl(150 38% 55%)" }}>
                                    Community Prayer
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <button onClick={() => review(p.id, "rejected")}
                                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-red-500/20"
                                  style={{ background: "hsl(0 72% 51% / 0.1)", color: "hsl(0 72% 65%)", border: "1px solid hsl(0 72% 51% / 0.3)" }}>
                                  <X className="w-4 h-4" />
                                </button>
                                <button onClick={() => review(p.id, "approved")}
                                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-emerald-500/20"
                                  style={{ background: "hsl(150 38% 26% / 0.15)", color: "hsl(150 38% 60%)", border: "1px solid hsl(150 38% 26% / 0.4)" }}>
                                  <Check className="w-4 h-4" />
                                </button>
                                <button onClick={async () => {
                                  if (!confirm("Permanently delete this prayer?")) return;
                                  await supabase.from("prayer_cards").delete().eq("id", p.id);
                                  setPending(prev => prev.filter(x => x.id !== p.id));
                                  toast({ title: "Prayer deleted" });
                                }}
                                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                                  style={{ background: "hsl(220 26% 14%)", color: "hsl(38 14% 50%)", border: "1px solid hsl(220 26% 20%)" }}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </GuardianCard>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── USER MANAGEMENT (Guardians) ── */}
              {activeTab === "users" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="font-display text-2xl font-bold" style={{ color: "hsl(38 28% 92%)" }}>Guardians of the Altar</h2>
                    <p className="text-xs mt-1" style={{ color: "hsl(38 14% 50%)" }}>Managing the devoted souls who keep the spiritual flame burning.</p>
                  </div>
                  {/* Inject the existing UserMonitorTab — styled wrapper */}
                  <div className="guardian-user-tab">
                    <UserMonitorTab />
                  </div>
                </div>
              )}

              {/* ── ANALYTICS (Sacred Insights) ── */}
              {activeTab === "insights" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <h2 className="font-display text-2xl font-bold" style={{ color: "hsl(42 85% 58%)" }}>✦ Sacred Insights</h2>
                      <p className="text-xs mt-1" style={{ color: "hsl(38 14% 50%)" }}>AI-powered analytics and divine engagement metrics</p>
                    </div>
                    <GoldButton onClick={generateFaq} disabled={genFaq}>
                      {genFaq ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      Refresh Insights
                    </GoldButton>
                  </div>

                  {/* AI Insights tab */}
                  <AIInsightsTab />

                  {/* Stats charts */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <GuardianCard>
                      <h3 className="text-sm font-semibold mb-4" style={{ color: "hsl(38 28% 88%)" }}>Prayer Intensity — Most Liked</h3>
                      <ResponsiveContainer width="100%" height={160}>
                        <BarChart data={topLiked.map(p => ({ name: (p.title || p.prayer_text).slice(0, 14) + "…", value: p.likes_count }))}>
                          <XAxis dataKey="name" tick={{ fontSize: 8, fill: "hsl(38,14%,45%)" }} axisLine={false} tickLine={false} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 8, fill: "hsl(38,14%,45%)" }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ background: "hsl(220,32%,13%)", border: "1px solid hsl(220,26%,18%)", borderRadius: "0.5rem", fontSize: "11px", color: "hsl(38,28%,88%)" }} />
                          <Bar dataKey="value" fill="hsl(42,85%,46%)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </GuardianCard>
                    <GuardianCard>
                      <h3 className="text-sm font-semibold mb-4" style={{ color: "hsl(38 28% 88%)" }}>Sacred Scripture Reach — Most Prayed</h3>
                      <div className="space-y-2">
                        {topPrayed.map((p, i) => (
                          <div key={p.id} className="flex items-center gap-3">
                            <p className="text-xs flex-1 truncate" style={{ color: "hsl(38 20% 70%)" }}>
                              {p.title || p.prayer_text.slice(0, 40)}
                            </p>
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 rounded-full" style={{
                                width: `${Math.max(20, (p.prayed_count / (topPrayed[0]?.prayed_count || 1)) * 80)}px`,
                                background: "linear-gradient(90deg, hsl(42,85%,46%), hsl(35,82%,54%))"
                              }} />
                              <span className="text-xs w-6 text-right" style={{ color: "hsl(42 85% 58%)" }}>{p.prayed_count}</span>
                            </div>
                          </div>
                        ))}
                        {topPrayed.length === 0 && <p className="text-xs py-3 text-center" style={{ color: "hsl(38 14% 45%)" }}>No data yet</p>}
                      </div>
                    </GuardianCard>
                  </div>
                </div>
              )}

              {/* ── MODERATION LOG (Testimonies) ── */}
              {activeTab === "testimonies" && <TestimoniesAdminTab />}

              {/* ── FEEDBACK ── */}
              {activeTab === "feedback" && <FeedbackAdminTab />}

              {/* ── PRAYERS ── */}
              {activeTab === "prayers" && <PrayersAdminTab onNewPrayer={() => setShowPrayerForm(true)} />}

              {/* ── BLOG ── */}
              {activeTab === "blog" && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-display text-2xl font-bold" style={{ color: "hsl(38 28% 92%)" }}>KeepGrow.ing Posts</h2>
                      <p className="text-xs mt-1" style={{ color: "hsl(38 14% 50%)" }}>Devotional content and faith encouragement</p>
                    </div>
                    <GoldButton onClick={() => setShowBlogForm(!showBlogForm)}>
                      <PlusCircle className="w-4 h-4" />New Post
                    </GoldButton>
                  </div>

                  {showBlogForm && (
                    <GuardianCard>
                      <h3 className="font-semibold mb-4" style={{ color: "hsl(38 28% 88%)" }}>Create Post</h3>
                      <Form {...blogForm}>
                        <form onSubmit={blogForm.handleSubmit(onBlogSubmit)} className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <FormField control={blogForm.control} name="title" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs" style={{ color: "hsl(38 14% 55%)" }}>Title</FormLabel>
                                <FormControl><DarkInput {...field} placeholder="Post title" /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={blogForm.control} name="slug" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs" style={{ color: "hsl(38 14% 55%)" }}>Slug</FormLabel>
                                <FormControl><DarkInput {...field} placeholder="post-url-slug" /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                          </div>
                          <FormField control={blogForm.control} name="excerpt" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs" style={{ color: "hsl(38 14% 55%)" }}>Excerpt</FormLabel>
                              <FormControl><DarkInput {...field} placeholder="Brief description…" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={blogForm.control} name="cover_image_url" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs" style={{ color: "hsl(38 14% 55%)" }}>Cover Image URL</FormLabel>
                              <FormControl><DarkInput {...field} placeholder="https://…" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={blogForm.control} name="content" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs" style={{ color: "hsl(38 14% 55%)" }}>Content (Markdown)</FormLabel>
                              <FormControl><DarkTextarea {...field} placeholder="Write post in Markdown…" rows={8} style={{ fontFamily: "monospace" }} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={blogForm.control} name="published" render={({ field }) => (
                            <FormItem className="flex items-center gap-3">
                              <input type="checkbox" checked={field.value} onChange={e => field.onChange(e.target.checked)} className="rounded" />
                              <FormLabel className="text-xs" style={{ color: "hsl(38 14% 55%)" }}>Publish immediately</FormLabel>
                            </FormItem>
                          )} />
                          <div className="flex gap-2">
                            <GoldButton type="submit">Save Post</GoldButton>
                            <DarkOutlineButton type="button" onClick={() => setShowBlogForm(false)}>Cancel</DarkOutlineButton>
                          </div>
                        </form>
                      </Form>
                    </GuardianCard>
                  )}

                  {blogPosts.length === 0 ? (
                    <p className="text-sm" style={{ color: "hsl(38 14% 50%)" }}>No posts yet. Create your first one!</p>
                  ) : (
                    <div className="space-y-2">
                      {blogPosts.map(post => (
                        <GuardianCard key={post.id} className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate" style={{ color: "hsl(38 28% 90%)" }}>{post.title}</p>
                            <p className="text-xs mt-0.5" style={{ color: "hsl(38 14% 45%)" }}>
                              {new Date(post.created_at).toLocaleDateString()} · /{post.slug}
                            </p>
                          </div>
                          <span className="text-[10px] px-2 py-1 rounded-full flex-shrink-0"
                            style={post.published
                              ? { background: "hsl(150 38% 26% / 0.25)", color: "hsl(150 38% 55%)" }
                              : { background: "hsl(220 26% 18%)", color: "hsl(38 14% 50%)" }}>
                            {post.published ? "Published" : "Draft"}
                          </span>
                          <button onClick={() => togglePublish(post.id, post.published)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: "hsl(220 26% 16%)", color: "hsl(38 14% 55%)" }}>
                            {post.published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </GuardianCard>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── FAQ ── */}
              {activeTab === "faq" && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <h2 className="font-display text-2xl font-bold" style={{ color: "hsl(38 28% 92%)" }}>AI FAQ Reports</h2>
                      <p className="text-xs mt-1" style={{ color: "hsl(38 14% 50%)" }}>Weekly AI analysis of PrayerAssist conversations</p>
                    </div>
                    <GoldButton onClick={generateFaq} disabled={genFaq}>
                      {genFaq ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      Generate Weekly FAQ
                    </GoldButton>
                  </div>
                  {reports.length === 0 ? (
                    <GuardianCard>
                      <p className="text-sm italic text-center py-4" style={{ color: "hsl(38 14% 50%)" }}>
                        No reports yet. Click "Generate Weekly FAQ" to create the first one.
                      </p>
                    </GuardianCard>
                  ) : reports.map(r => (
                    <GuardianCard key={r.id}>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-sm" style={{ color: "hsl(38 28% 90%)" }}>{r.title}</h3>
                        <span className="text-xs" style={{ color: "hsl(38 14% 45%)" }}>{new Date(r.generated_at).toLocaleDateString()}</span>
                      </div>
                      <div className="prose prose-sm max-w-none" style={{ color: "hsl(38 20% 75%)" }}>
                        <ReactMarkdown>{r.content}</ReactMarkdown>
                      </div>
                    </GuardianCard>
                  ))}
                </div>
              )}

              {/* ── VERSES ── */}
              {activeTab === "verses" && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <h2 className="font-display text-2xl font-bold" style={{ color: "hsl(38 28% 92%)" }}>Verse Summaries & Exegesis</h2>
                      <p className="text-xs mt-1" style={{ color: "hsl(38 14% 50%)" }}>{verseSummaries.length} cached scriptures</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "hsl(38 14% 45%)" }} />
                      <DarkInput
                        value={verseSearch}
                        onChange={e => setVerseSearch(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") loadVerses(verseSearch); }}
                        placeholder="Search by reference, summary, or exegesis…"
                        className="pl-9"
                      />
                    </div>
                    <GoldButton onClick={() => loadVerses(verseSearch)} disabled={verseSearching}>
                      {verseSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    </GoldButton>
                    <DarkOutlineButton onClick={() => { setVerseSearch(""); loadVerses(""); }}>Clear</DarkOutlineButton>
                  </div>

                  {verseSearching ? (
                    <div className="flex items-center gap-2 py-6" style={{ color: "hsl(38 14% 50%)" }}>
                      <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Searching…</span>
                    </div>
                  ) : verseSummaries.length === 0 ? (
                    <GuardianCard><p className="text-sm text-center py-4" style={{ color: "hsl(38 14% 50%)" }}>No verse summaries found.</p></GuardianCard>
                  ) : (
                    <div className="space-y-3">
                      {verseSummaries.map(v => {
                        const isEditing = editingVerseId === v.id;
                        return (
                          <GuardianCard key={v.id}>
                            <div className="flex items-start justify-between gap-3 mb-3">
                              {isEditing ? (
                                <DarkInput value={editingVerse.reference || ""} onChange={e => setEditingVerse(p => ({ ...p, reference: e.target.value }))} className="flex-1" placeholder="Reference…" />
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                                  style={{ background: "hsl(42 85% 46% / 0.15)", color: "hsl(42 85% 58%)", border: "1px solid hsl(42 85% 46% / 0.3)" }}>
                                  <BookMarked className="w-3 h-3" />{v.reference}
                                </span>
                              )}
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-xs" style={{ color: "hsl(38 14% 45%)" }}>{new Date(v.created_at).toLocaleDateString()}</span>
                                {isEditing ? (
                                  <>
                                    <GoldButton onClick={saveVerseEdit} disabled={savingVerse} className="h-7 text-xs px-3">
                                      {savingVerse ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}Save
                                    </GoldButton>
                                    <DarkOutlineButton onClick={() => { setEditingVerseId(null); setEditingVerse({}); }} className="h-7 text-xs px-3">
                                      <XCircle className="w-3 h-3" />Cancel
                                    </DarkOutlineButton>
                                  </>
                                ) : (
                                  <button onClick={() => { setEditingVerseId(v.id); setEditingVerse({ reference: v.reference, verse_text: v.verse_text ?? "", summary: v.summary ?? "", exegesis: v.exegesis ?? "" }); }}
                                    className="h-7 px-3 text-xs rounded-lg flex items-center gap-1 transition-colors"
                                    style={{ background: "hsl(220 26% 16%)", color: "hsl(38 14% 55%)" }}>
                                    <Pencil className="w-3 h-3" />Edit
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="space-y-3">
                              <div>
                                <p className="text-[10px] font-medium mb-1 uppercase tracking-wider" style={{ color: "hsl(38 14% 45%)" }}>Verse Text</p>
                                {isEditing ? (
                                  <DarkTextarea value={editingVerse.verse_text ?? ""} onChange={e => setEditingVerse(p => ({ ...p, verse_text: e.target.value }))} rows={2} placeholder="Verse text…" />
                                ) : (
                                  <p className="text-sm italic leading-relaxed" style={{ color: "hsl(38 20% 72%)" }}>{v.verse_text || "—"}</p>
                                )}
                              </div>
                              <div>
                                <p className="text-[10px] font-medium mb-1 uppercase tracking-wider" style={{ color: "hsl(38 14% 45%)" }}>Summary</p>
                                {isEditing ? (
                                  <DarkTextarea value={editingVerse.summary ?? ""} onChange={e => setEditingVerse(p => ({ ...p, summary: e.target.value }))} rows={3} placeholder="Summary…" />
                                ) : (
                                  <p className="text-sm leading-relaxed" style={{ color: "hsl(38 20% 72%)" }}>{v.summary || "—"}</p>
                                )}
                              </div>
                              {(isEditing || v.exegesis) && (
                                <div>
                                  <p className="text-[10px] font-medium mb-1 uppercase tracking-wider" style={{ color: "hsl(38 14% 45%)" }}>Exegesis</p>
                                  {isEditing ? (
                                    <DarkTextarea value={editingVerse.exegesis ?? ""} onChange={e => setEditingVerse(p => ({ ...p, exegesis: e.target.value }))} rows={5} placeholder="In-depth exegesis…" />
                                  ) : (
                                    <details>
                                      <summary className="text-xs cursor-pointer" style={{ color: "hsl(42 85% 55%)" }}>▶ View Exegesis</summary>
                                      <p className="text-sm leading-relaxed mt-2 pl-3" style={{ color: "hsl(38 20% 70%)", borderLeft: "2px solid hsl(42 85% 46% / 0.3)" }}>{v.exegesis}</p>
                                    </details>
                                  )}
                                </div>
                              )}
                            </div>
                          </GuardianCard>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── PRAYER REQUESTS INBOX ── */}
              {activeTab === "prayer-requests" && (
                <PrayerRequestsInbox />
              )}

              {/* ── CONTACT ── */}
              {activeTab === "contacts" && (
                <div className="space-y-5">
                  <div>
                    <h2 className="font-display text-2xl font-bold" style={{ color: "hsl(38 28% 92%)" }}>Contact Submissions</h2>
                    <p className="text-xs mt-1" style={{ color: "hsl(38 14% 50%)" }}>{contacts.length} messages received</p>
                  </div>
                  {contacts.length === 0 ? (
                    <GuardianCard><p className="text-sm text-center py-4" style={{ color: "hsl(38 14% 50%)" }}>No contact submissions yet.</p></GuardianCard>
                  ) : (
                    <div className="space-y-3">
                      {contacts.map(c => (
                        <GuardianCard key={c.id}>
                          <div className="flex items-center gap-3 flex-wrap mb-3">
                            {c.name && <span className="font-medium text-sm" style={{ color: "hsl(38 28% 90%)" }}>{c.name}</span>}
                            {c.email && <span className="text-xs" style={{ color: "hsl(38 14% 50%)" }}>{c.email}</span>}
                            <span className="text-xs ml-auto" style={{ color: "hsl(38 14% 45%)" }}>{new Date(c.created_at).toLocaleDateString()}</span>
                          </div>
                          <div className="rounded-xl px-3 py-2 mb-2" style={{ background: "hsl(220 26% 14%)" }}>
                            <p className="text-xs font-medium mb-1" style={{ color: "hsl(38 14% 50%)" }}>Message</p>
                            <p className="text-sm" style={{ color: "hsl(38 20% 72%)" }}>{c.message}</p>
                          </div>
                          {c.ai_reply && (
                            <div className="rounded-xl px-3 py-2" style={{ background: "hsl(42 85% 46% / 0.08)", border: "1px solid hsl(42 85% 46% / 0.2)" }}>
                              <p className="text-xs font-medium mb-1 flex items-center gap-1" style={{ color: "hsl(42 85% 58%)" }}>
                                <Sparkles className="w-3 h-3" />AI Reply
                                {c.replied_at && <span className="font-normal" style={{ color: "hsl(38 14% 45%)" }}>· {new Date(c.replied_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
                              </p>
                              <p className="text-sm whitespace-pre-line" style={{ color: "hsl(38 20% 72%)" }}>{c.ai_reply}</p>
                            </div>
                          )}
                        </GuardianCard>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>

    {/* AI Enrich panel */}
    {enrichCardId && (
      <AIEnrichPanel
        open={enrichOpen}
        onOpenChange={open => { setEnrichOpen(open); if (!open) { setEnrichCardId(null); setEnrichCardText(""); setEnrichCardExtended(null); } }}
        cardId={enrichCardId}
        prayerText={enrichCardText}
        extendedPrayer={enrichCardExtended}
        existingLabels={[]}
        onApplied={() => { load(); setEnrichOpen(false); setEnrichCardId(null); }}
      />
    )}
    </>
  );
}

// ── SHARED DARK UI PRIMITIVES ────────────────────────────────────────────────

function GuardianCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl p-5 ${className}`}
      style={{ background: "hsl(220 32% 10%)", border: "1px solid hsl(220 26% 15%)" }}>
      {children}
    </div>
  );
}

function GoldButton({ children, className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) {
  return (
    <button
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      style={{ background: "linear-gradient(135deg, hsl(42 85% 44%), hsl(35 82% 54%))", color: "white", boxShadow: "0 4px 14px -4px hsl(42 85% 46% / 0.5)" }}
      {...props}
    >
      {children}
    </button>
  );
}

function DarkOutlineButton({ children, className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) {
  return (
    <button
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${className}`}
      style={{ background: "transparent", color: "hsl(38 20% 65%)", border: "1px solid hsl(220 26% 22%)" }}
      {...props}
    >
      {children}
    </button>
  );
}

function DarkInput({ className = "", style, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full h-10 rounded-xl px-3 text-sm outline-none transition-colors focus:ring-1 ${className}`}
      style={{ background: "hsl(220 26% 14%)", border: "1px solid hsl(220 26% 20%)", color: "hsl(38 28% 88%)", ...style }}
      {...props}
    />
  );
}

function DarkTextarea({ className = "", style, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-colors focus:ring-1 resize-none ${className}`}
      style={{ background: "hsl(220 26% 14%)", border: "1px solid hsl(220 26% 20%)", color: "hsl(38 28% 88%)", ...style }}
      {...props}
    />
  );
}

// ── PRAYERS ADMIN TAB ────────────────────────────────────────────────────────
function PrayersAdminTab({ onNewPrayer }: { onNewPrayer?: () => void }) {
  interface AdminPrayer {
    id: string; title: string | null; prayer_text: string;
    extended_prayer: string | null; labels: string[] | null;
    text_style: string | null; background_url: string | null;
    status: string; source: string; created_at: string;
    likes_count: number; prayed_count: number; views: number;
  }

  const [prayers, setPrayers] = useState<AdminPrayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<AdminPrayer> & { labelsRaw?: string }>({});
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const loadPrayers = async (q = "") => {
    setLoading(true);
    let query = supabase.from("prayer_cards")
      .select("id,title,prayer_text,extended_prayer,labels,text_style,background_url,status,source,created_at,likes_count,prayed_count,views")
      .eq("source", "admin").order("created_at", { ascending: false });
    if (q.trim()) query = query.or(`title.ilike.%${q}%,prayer_text.ilike.%${q}%`);
    const { data } = await query;
    setPrayers((data as AdminPrayer[]) || []);
    setLoading(false);
  };

  useEffect(() => { loadPrayers(); }, []);

  const startEdit = (p: AdminPrayer) => { setEditingId(p.id); setEditForm({ ...p, labelsRaw: (p.labels || []).join(", ") }); };
  const cancelEdit = () => { setEditingId(null); setEditForm({}); };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    const labelsArr = editForm.labelsRaw ? editForm.labelsRaw.split(",").map((t: string) => t.trim().toLowerCase().replace(/\s+/g, "-")).filter(Boolean) : [];
    const { error } = await supabase.from("prayer_cards").update({
      title: editForm.title || null, prayer_text: (editForm.prayer_text || "").trim(),
      extended_prayer: editForm.extended_prayer?.trim() || null,
      labels: labelsArr.length ? labelsArr : null, text_style: editForm.text_style || "classic",
      background_url: editForm.background_url || null, status: editForm.status || "approved",
    }).eq("id", editingId);
    setSaving(false);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Prayer updated ✓" });
    cancelEdit(); loadPrayers(searchQuery);
  };

  const deletePrayer = async (id: string) => {
    if (!confirm("Permanently delete this prayer card? This cannot be undone.")) return;
    const { error } = await supabase.from("prayer_cards").delete().eq("id", id);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Prayer deleted" });
    loadPrayers(searchQuery);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold" style={{ color: "hsl(38 28% 92%)" }}>Admin Prayer Cards</h2>
          <p className="text-xs mt-1" style={{ color: "hsl(38 14% 50%)" }}>{prayers.length} curated prayers</p>
        </div>
        {onNewPrayer && (
          <GoldButton onClick={() => { onNewPrayer(); }}>
            <PlusCircle className="w-4 h-4" />New Prayer
          </GoldButton>
        )}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "hsl(38 14% 45%)" }} />
          <DarkInput value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") loadPrayers(searchQuery); }}
            placeholder="Search by title or prayer text…" className="pl-9" />
        </div>
        <GoldButton onClick={() => loadPrayers(searchQuery)} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </GoldButton>
        <DarkOutlineButton onClick={() => { setSearchQuery(""); loadPrayers(""); }}>Clear</DarkOutlineButton>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-6" style={{ color: "hsl(38 14% 50%)" }}>
          <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Loading prayers…</span>
        </div>
      ) : prayers.length === 0 ? (
        <GuardianCard><p className="text-sm italic text-center py-4" style={{ color: "hsl(38 14% 50%)" }}>No admin prayer cards found.</p></GuardianCard>
      ) : (
        <div className="space-y-3">
          {prayers.map(p => {
            const isEditing = editingId === p.id;
            return (
              <GuardianCard key={p.id}>
                <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                  <div className="flex-1 min-w-0">
                    {!isEditing && <p className="font-semibold text-sm truncate" style={{ color: "hsl(38 28% 90%)" }}>{p.title || <span style={{ color: "hsl(38 14% 45%)", fontStyle: "italic" }}>No title</span>}</p>}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs" style={{ color: "hsl(38 14% 45%)" }}>{new Date(p.created_at).toLocaleDateString()}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full"
                        style={p.status === "approved" ? { background: "hsl(150 38% 26% / 0.25)", color: "hsl(150 38% 55%)" } : { background: "hsl(220 26% 18%)", color: "hsl(38 14% 50%)" }}>
                        {p.status}
                      </span>
                      <span className="text-xs" style={{ color: "hsl(38 14% 45%)" }}>❤️ {p.likes_count} · 🙏 {p.prayed_count} · 👁️ {p.views}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!isEditing ? (
                      <>
                        <button onClick={() => startEdit(p)}
                          className="h-7 px-3 text-xs rounded-lg flex items-center gap-1"
                          style={{ background: "hsl(220 26% 16%)", color: "hsl(38 14% 55%)" }}>
                          <Pencil className="w-3 h-3" />Edit
                        </button>
                        <button onClick={() => deletePrayer(p.id)}
                          className="h-7 px-3 text-xs rounded-lg flex items-center gap-1"
                          style={{ background: "hsl(0 72% 51% / 0.1)", color: "hsl(0 72% 60%)", border: "1px solid hsl(0 72% 51% / 0.3)" }}>
                          <Trash2 className="w-3 h-3" />Delete
                        </button>
                      </>
                    ) : (
                      <>
                        <GoldButton onClick={saveEdit} disabled={saving} className="h-7 text-xs px-3">
                          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}Save
                        </GoldButton>
                        <DarkOutlineButton onClick={cancelEdit} className="h-7 text-xs px-3">
                          <XCircle className="w-3 h-3" />Cancel
                        </DarkOutlineButton>
                      </>
                    )}
                  </div>
                </div>
                {isEditing ? (
                  <div className="space-y-3 pt-3" style={{ borderTop: "1px solid hsl(220 26% 17%)" }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs mb-1 block" style={{ color: "hsl(38 14% 50%)" }}>Title</label>
                        <DarkInput value={editForm.title || ""} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} placeholder="Title (optional)" maxLength={100} />
                      </div>
                      <div>
                        <label className="text-xs mb-1 block" style={{ color: "hsl(38 14% 50%)" }}>Status</label>
                        <select value={editForm.status || "approved"} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                          className="w-full h-10 rounded-xl px-3 text-sm outline-none"
                          style={{ background: "hsl(220 26% 14%)", border: "1px solid hsl(220 26% 20%)", color: "hsl(38 28% 88%)" }}>
                          <option value="approved">Approved</option>
                          <option value="pending">Pending</option>
                          <option value="rejected">Rejected</option>
                          <option value="private">Private</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: "hsl(38 14% 50%)" }}>Prayer Text <span style={{ color: "hsl(0 72% 60%)" }}>*</span></label>
                      <DarkTextarea value={editForm.prayer_text || ""} onChange={e => setEditForm(f => ({ ...f, prayer_text: e.target.value }))} rows={5} maxLength={5000} />
                      <p className="text-xs text-right mt-0.5" style={{ color: "hsl(38 14% 45%)" }}>{(editForm.prayer_text || "").length}/5000</p>
                    </div>
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: "hsl(38 14% 50%)" }}>Scripture / Extended Prayer</label>
                      <DarkTextarea value={editForm.extended_prayer || ""} onChange={e => setEditForm(f => ({ ...f, extended_prayer: e.target.value }))} rows={3} maxLength={5000} />
                    </div>
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: "hsl(38 14% 50%)" }}>Labels (comma-separated)</label>
                      <DarkInput value={editForm.labelsRaw || ""} onChange={e => setEditForm(f => ({ ...f, labelsRaw: e.target.value }))} placeholder="peace, healing, faith" />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm line-clamp-2" style={{ color: "hsl(38 14% 55%)" }}>{p.prayer_text}</p>
                )}
              </GuardianCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── TESTIMONIES ADMIN TAB ─────────────────────────────────────────────────────
function TestimoniesAdminTab() {
  const [flags, setFlags] = useState<{ id: string; reason: string | null; created_at: string; testimony_id: string; user_id: string; testimonies: { body: string; prayer_id: string; flagged: boolean } | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("testimony_flags").select("*, testimonies(body,prayer_id,flagged)").order("created_at", { ascending: false }).limit(50);
    setFlags((data as typeof flags) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const deleteTestimony = async (testimonyId: string) => {
    await supabase.from("testimonies").delete().eq("id", testimonyId);
    toast({ title: "Testimony deleted" });
    load();
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-bold" style={{ color: "hsl(38 28% 92%)" }}>Moderation Log</h2>
        <p className="text-xs mt-1" style={{ color: "hsl(38 14% 50%)" }}>Flagged testimonies requiring review — {flags.length} flagged</p>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 py-6" style={{ color: "hsl(38 14% 50%)" }}>
          <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Loading…</span>
        </div>
      ) : flags.length === 0 ? (
        <GuardianCard><p className="text-sm italic text-center py-4" style={{ color: "hsl(38 14% 50%)" }}>No flagged testimonies 🙏</p></GuardianCard>
      ) : (
        <div className="space-y-3">
          {flags.map(f => (
            <GuardianCard key={f.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "hsl(0 72% 51% / 0.15)", color: "hsl(0 72% 60%)", border: "1px solid hsl(0 72% 51% / 0.3)" }}>
                      🚩 Flagged
                    </span>
                    <span className="text-xs" style={{ color: "hsl(38 14% 45%)" }}>{new Date(f.created_at).toLocaleDateString()}</span>
                  </div>
                  {f.reason && <p className="text-xs mb-2" style={{ color: "hsl(38 14% 50%)" }}>Reason: {f.reason}</p>}
                  {f.testimonies?.body && (
                    <p className="text-sm leading-relaxed" style={{ color: "hsl(38 20% 72%)" }}>"{f.testimonies.body}"</p>
                  )}
                </div>
                <button onClick={() => deleteTestimony(f.testimony_id)}
                  className="h-8 px-3 text-xs rounded-lg flex items-center gap-1 flex-shrink-0"
                  style={{ background: "hsl(0 72% 51% / 0.1)", color: "hsl(0 72% 60%)", border: "1px solid hsl(0 72% 51% / 0.3)" }}>
                  <Trash2 className="w-3 h-3" />Delete
                </button>
              </div>
            </GuardianCard>
          ))}
        </div>
      )}
    </div>
  );
}

// ── FEEDBACK ADMIN TAB ─────────────────────────────────────────────────────
function FeedbackAdminTab() {
  const [items, setItems] = useState<{ id: string; feedback_type: string; title: string | null; message: string; created_at: string; user_id: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "feature_request" | "improvement">("all");

  const load = async () => {
    setLoading(true);
    let q = supabase.from("feedback_submissions").select("*").order("created_at", { ascending: false }).limit(100);
    if (filter !== "all") q = q.eq("feedback_type", filter);
    const { data } = await q;
    setItems((data as typeof items) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold" style={{ color: "hsl(38 28% 92%)" }}>Community Feedback</h2>
          <p className="text-xs mt-1" style={{ color: "hsl(38 14% 50%)" }}>Feature requests and improvement suggestions — {items.length} submissions</p>
        </div>
        <div className="flex gap-1">
          {(["all", "feature_request", "improvement"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-3 py-1.5 text-xs rounded-lg transition-all"
              style={{
                background: filter === f ? "hsl(42 85% 46% / 0.15)" : "transparent",
                color: filter === f ? "hsl(42 85% 58%)" : "hsl(38 14% 50%)",
                border: `1px solid ${filter === f ? "hsl(42 85% 46% / 0.3)" : "hsl(220 26% 13%)"}`,
              }}>
              {f === "all" ? "All" : f === "feature_request" ? "Features" : "Improvements"}
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 py-6" style={{ color: "hsl(38 14% 50%)" }}>
          <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Loading…</span>
        </div>
      ) : items.length === 0 ? (
        <GuardianCard><p className="text-sm italic text-center py-4" style={{ color: "hsl(38 14% 50%)" }}>No feedback yet 💛</p></GuardianCard>
      ) : (
        <div className="space-y-3">
          {items.map(fb => (
            <GuardianCard key={fb.id}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{
                        background: fb.feedback_type === "feature_request" ? "hsl(42 85% 46% / 0.15)" : "hsl(210 55% 50% / 0.15)",
                        color: fb.feedback_type === "feature_request" ? "hsl(42 85% 58%)" : "hsl(210 55% 70%)",
                        border: `1px solid ${fb.feedback_type === "feature_request" ? "hsl(42 85% 46% / 0.3)" : "hsl(210 55% 50% / 0.3)"}`,
                      }}>
                      {fb.feedback_type === "feature_request" ? "💡 Feature Request" : "📈 Improvement"}
                    </span>
                    <span className="text-xs" style={{ color: "hsl(38 14% 45%)" }}>{new Date(fb.created_at).toLocaleDateString()}</span>
                  </div>
                  {fb.title && <p className="text-sm font-semibold mb-1" style={{ color: "hsl(38 28% 88%)" }}>{fb.title}</p>}
                  <p className="text-sm leading-relaxed" style={{ color: "hsl(38 20% 72%)" }}>{fb.message}</p>
                </div>
              </div>
            </GuardianCard>
          ))}
        </div>
      )}
    </div>
  );
}
