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
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft, Check, X, Loader2, RefreshCw, Users, BookOpen, Mail,
  BarChart2, FileText, PlusCircle, Eye, EyeOff, Sparkles, BookMarked, Search, ScrollText,
  Pencil, Save, XCircle, Scroll, Trash2,
} from "lucide-react";
import AIInsightsTab from "@/components/admin/AIInsightsTab";
import UserMonitorTab from "@/components/admin/UserMonitorTab";
import AIEnrichPanel from "@/components/AIEnrichPanel";

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
  tags: z.string().optional(),
  text_style: z.string().default("classic"),
  background_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});
type PrayerCardFormValues = z.infer<typeof prayerCardSchema>;

interface PrayerStat { id: string; title: string | null; prayer_text: string; likes_count: number; prayed_count: number; views: number; }
interface ContactSubmission { id: string; name: string | null; email: string | null; message: string; created_at: string; ai_reply: string | null; replied_at: string | null; }
interface AdminReport { id: string; title: string; content: string; generated_at: string; }
interface BlogPost { id: string; title: string; slug: string; excerpt: string | null; published: boolean | null; created_at: string; }
interface VerseSummary { id: string; reference: string; verse_text: string | null; summary: string | null; exegesis: string | null; created_at: string; }

export default function Admin() {
  const { user, session } = useAuth();
  const [pending, setPending] = useState<{ id: string; title: string | null; prayer_text: string; created_at: string }[]>([]);
  const [stats, setStats] = useState({ total: 0, approved: 0, pending: 0 });
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
  const [activeTab, setActiveTab] = useState<"moderation" | "stats" | "users" | "contacts" | "blog" | "faq" | "insights" | "verses" | "testimonies" | "prayers">("moderation");
  const { toast } = useToast();
  // AI Enrich — opened after a prayer card is first saved so we have a card ID
  const [enrichCardId, setEnrichCardId] = useState<string | null>(null);
  const [enrichCardText, setEnrichCardText] = useState("");
  const [enrichCardExtended, setEnrichCardExtended] = useState<string | null>(null);
  const [enrichOpen, setEnrichOpen] = useState(false);
  // Verse editing
  const [editingVerseId, setEditingVerseId] = useState<string | null>(null);
  const [editingVerse, setEditingVerse] = useState<Partial<VerseSummary>>({});
  const [savingVerse, setSavingVerse] = useState(false);

  const blogForm = useForm<BlogFormValues>({
    resolver: zodResolver(blogSchema),
    defaultValues: { title: "", slug: "", excerpt: "", content: "", cover_image_url: "", published: false },
  });

  const prayerForm = useForm<PrayerCardFormValues>({
    resolver: zodResolver(prayerCardSchema),
    defaultValues: { title: "", prayer_text: "", extended_prayer: "", tags: "", text_style: "classic", background_url: "" },
  });

  const load = useCallback(async () => {
    const [
      { data: p },
      { count: total },
      { count: approved },
      { count: pend },
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
      supabase.from("prayer_cards").select("id,title,prayer_text,likes_count,prayed_count,views").order("likes_count", { ascending: false }).limit(5),
      supabase.from("prayer_cards").select("id,title,prayer_text,likes_count,prayed_count,views").order("prayed_count", { ascending: false }).limit(5),
      supabase.from("profiles").select("created_at").order("created_at", { ascending: true }),
      supabase.from("contact_submissions").select("*").order("created_at", { ascending: false }),
      supabase.from("admin_reports").select("*").order("generated_at", { ascending: false }).limit(5),
      supabase.from("blog_posts").select("id,title,slug,excerpt,published,created_at").order("created_at", { ascending: false }),
    ]);

    setPending(p || []);
    setStats({ total: total || 0, approved: approved || 0, pending: pend || 0 });
    setTopLiked((liked as PrayerStat[]) || []);
    setTopPrayed((prayed as PrayerStat[]) || []);
    setContacts((contactData as ContactSubmission[]) || []);
    setReports((reportData as AdminReport[]) || []);
    setBlogPosts((blogData as BlogPost[]) || []);

    // Group signups by date (last 30 days)
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
      title: values.title,
      slug: values.slug,
      excerpt: values.excerpt || null,
      content: values.content,
      cover_image_url: values.cover_image_url || null,
      published: values.published,
      author_id: user?.id || null,
    });
    if (error) { toast({ title: "Failed to save post", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Blog post saved! 📝" });
    blogForm.reset();
    setShowBlogForm(false);
    load();
  };

  const togglePublish = async (id: string, current: boolean | null) => {
    await supabase.from("blog_posts").update({ published: !current }).eq("id", id);
    load();
  };

  const onPrayerCardSubmit = async (values: PrayerCardFormValues) => {
    if (!user) return;
    setSavingPrayer(true);
    try {
      const tagsArr = values.tags
        ? values.tags.split(",").map(t => t.trim().toLowerCase().replace(/\s+/g, "-")).filter(Boolean)
        : [];
      const { data: newCard, error } = await supabase.from("prayer_cards").insert({
        title: values.title || null,
        prayer_text: values.prayer_text.trim(),
        extended_prayer: values.extended_prayer?.trim() || null,
        tags: tagsArr.length ? tagsArr : null,
        text_style: values.text_style,
        background_url: values.background_url || null,
        created_by: user.id,
        source: "admin",
        status: "approved",
      }).select("id").single();
      if (error) throw error;
      toast({ title: "Prayer card published! 🙏" });
      prayerForm.reset();
      setShowPrayerForm(false);
      load();
      // Offer AI Enrich right after saving
      if (newCard?.id) {
        setEnrichCardId(newCard.id);
        setEnrichCardText(values.prayer_text.trim());
        setEnrichCardExtended(values.extended_prayer?.trim() || null);
        setEnrichOpen(true);
      }
    } catch (e) {
      toast({ title: "Failed to save prayer", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    } finally {
      setSavingPrayer(false);
    }
  };

  const saveVerseEdit = async () => {
    if (!editingVerseId) return;
    setSavingVerse(true);
    try {
      const { error } = await supabase.from("verse_summaries").update({
        reference: editingVerse.reference,
        verse_text: editingVerse.verse_text ?? null,
        summary: editingVerse.summary ?? null,
        exegesis: editingVerse.exegesis ?? null,
      }).eq("id", editingVerseId);
      if (error) throw error;
      toast({ title: "Verse saved ✓" });
      setEditingVerseId(null);
      setEditingVerse({});
      loadVerses(verseSearch);
    } catch (e) {
      toast({ title: "Save failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    } finally {
      setSavingVerse(false);
    }
  };

  const loadVerses = useCallback(async (search = "") => {
    setVerseSearching(true);
    try {
      let q = supabase.from("verse_summaries").select("*").order("created_at", { ascending: false }).limit(50);
      if (search.trim()) {
        q = q.or(`reference.ilike.%${search}%,summary.ilike.%${search}%,exegesis.ilike.%${search}%`);
      }
      const { data } = await q;
      setVerseSummaries((data as VerseSummary[]) || []);
    } finally {
      setVerseSearching(false);
    }
  }, []);

  useEffect(() => { if (activeTab === "verses") loadVerses(); }, [activeTab, loadVerses]);

  const TABS = [
    { id: "moderation", label: "Moderation", icon: Check },
    { id: "prayers", label: "Prayers", icon: Scroll },
    { id: "stats", label: "Stats", icon: BarChart2 },
    { id: "users", label: "Users", icon: Users },
    { id: "contacts", label: "Contact", icon: Mail },
    { id: "blog", label: "KeepGrow.ing", icon: BookOpen },
    { id: "verses", label: "Verses", icon: BookMarked },
    { id: "faq", label: "FAQ Report", icon: FileText },
    { id: "insights", label: "AI Insights", icon: Sparkles },
    { id: "testimonies", label: "Testimonies", icon: ScrollText },
  ] as const;

  return (
    <>
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm">
          <ArrowLeft className="w-4 h-4" />Home
        </Link>
        <h1 className="font-display text-3xl font-bold mb-6">Admin Dashboard</h1>

        {/* Stats summary */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[["Total Prayers", stats.total], ["Approved", stats.approved], ["Pending", stats.pending]].map(([label, val]) => (
            <div key={String(label)} className="prayer-card p-5 text-center">
              <div className="font-display text-3xl font-bold text-primary">{val}</div>
              <div className="text-sm text-muted-foreground mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 flex-wrap sm:flex-nowrap overflow-x-auto mb-6 border-b border-border pb-2 scrollbar-none -mx-1 px-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-t-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${activeTab === tab.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}>
                <Icon className="w-4 h-4" />{tab.label}
                {tab.id === "moderation" && pending.length > 0 && <span className="ml-1 bg-destructive text-destructive-foreground rounded-full text-xs w-4 h-4 flex items-center justify-center">{pending.length}</span>}
              </button>
            );
          })}
        </div>

        {/* ── MODERATION TAB ── */}
        {activeTab === "moderation" && (
          <div className="space-y-6">
            {/* Create Prayer Card */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-xl font-semibold">Create Prayer Card</h2>
                <Button size="sm" className="btn-gold rounded-xl gap-1.5" onClick={() => setShowPrayerForm(v => !v)}>
                  <PlusCircle className="w-4 h-4" />{showPrayerForm ? "Cancel" : "New Prayer Card"}
                </Button>
              </div>

              {showPrayerForm && (
                <div className="prayer-card p-5 mb-6">
                  <p className="text-xs text-muted-foreground mb-4">Cards created here are automatically published as <span className="font-semibold text-primary">Curated (Admin)</span> and visible immediately.</p>
                  <Form {...prayerForm}>
                    <form onSubmit={prayerForm.handleSubmit(onPrayerCardSubmit)} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FormField control={prayerForm.control} name="title" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Title (optional)</FormLabel>
                            <FormControl><Input {...field} placeholder="e.g. Morning Surrender" className="rounded-xl text-sm" maxLength={100} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={prayerForm.control} name="text_style" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Text Style</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="rounded-xl text-sm"><SelectValue /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {TEXT_STYLES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      <FormField control={prayerForm.control} name="prayer_text" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Prayer Text <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Write the prayer…" rows={5} className="rounded-xl text-sm resize-none" maxLength={5000} />
                          </FormControl>
                          <p className="text-xs text-muted-foreground text-right">{field.value?.length ?? 0}/5000</p>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={prayerForm.control} name="extended_prayer" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Scripture / Extended Prayer (optional)</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Related scripture or extended meditation… (e.g. John 3:16)" rows={3} className="rounded-xl text-sm resize-none" maxLength={5000} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FormField control={prayerForm.control} name="tags" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Tags (comma-separated)</FormLabel>
                            <FormControl><Input {...field} placeholder="peace, healing, morning-prayer" className="rounded-xl text-sm" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={prayerForm.control} name="background_url" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Background Image URL (optional)</FormLabel>
                            <FormControl><Input {...field} placeholder="https://…" className="rounded-xl text-sm" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      <div className="flex gap-2 pt-1">
                        <Button type="submit" disabled={savingPrayer} className="btn-gold rounded-xl gap-1.5 text-sm">
                          {savingPrayer ? <><Loader2 className="w-4 h-4 animate-spin" />Publishing…</> : <><ScrollText className="w-4 h-4" />Publish Prayer Card</>}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => { setShowPrayerForm(false); prayerForm.reset(); }} className="rounded-xl text-sm">Cancel</Button>
                      </div>
                    </form>
                  </Form>
                </div>
              )}
            </div>

            {/* Review Queue */}
            <div>
              <h2 className="font-display text-xl font-semibold mb-4">Community Review Queue ({pending.length})</h2>
              {pending.length === 0 ? <p className="text-muted-foreground text-sm">No prayers pending review 🙏</p> : (
                <div className="space-y-4">
                  {pending.map(p => (
                    <div key={p.id} className="prayer-card p-5 space-y-3">
                      {p.title && <h3 className="font-semibold">{p.title}</h3>}
                      <p className="text-sm text-muted-foreground line-clamp-3">{p.prayer_text}</p>
                      <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</p>
                    <div className="flex gap-2">
                        <Button size="sm" onClick={() => review(p.id, "approved")} className="btn-gold rounded-xl gap-1.5"><Check className="w-3.5 h-3.5" />Approve</Button>
                        <Button size="sm" variant="destructive" onClick={() => review(p.id, "rejected")} className="rounded-xl gap-1.5"><X className="w-3.5 h-3.5" />Reject</Button>
                        <Button size="sm" variant="outline" className="rounded-xl gap-1.5 text-destructive hover:bg-destructive hover:text-destructive-foreground border-destructive/40" onClick={async () => { if (!confirm("Permanently delete this prayer?")) return; await supabase.from("prayer_cards").delete().eq("id", p.id); setPending(prev => prev.filter(x => x.id !== p.id)); toast({ title: "Prayer deleted" }); }}>
                          <Trash2 className="w-3.5 h-3.5" />Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── USERS TAB ── */}
        {activeTab === "users" && (
          <div>
            <h2 className="font-display text-xl font-semibold mb-4">User Monitor</h2>
            <UserMonitorTab />
          </div>
        )}

        {/* ── STATS TAB ── */}
        {activeTab === "stats" && (
          <div className="space-y-8">
            <div>
              <h2 className="font-display text-xl font-semibold mb-4">User Signups (Last 14 Days)</h2>
              <div className="prayer-card p-4">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={signupData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem", fontSize: "12px" }} />
                    <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3">Top 5 Most Liked</h3>
                <div className="prayer-card p-4">
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={topLiked.map(p => ({ name: (p.title || p.prayer_text).slice(0, 18) + "…", value: p.likes_count }))}>
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 9 }} />
                      <Tooltip contentStyle={{ fontSize: "11px" }} />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-3">Top 5 Most Prayed</h3>
                <div className="prayer-card p-4">
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={topPrayed.map(p => ({ name: (p.title || p.prayer_text).slice(0, 18) + "…", value: p.prayed_count }))}>
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 9 }} />
                      <Tooltip contentStyle={{ fontSize: "11px" }} />
                      <Bar dataKey="value" fill="hsl(var(--forest))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── CONTACTS TAB ── */}
        {activeTab === "contacts" && (
          <div>
            <h2 className="font-display text-xl font-semibold mb-4">Contact Submissions ({contacts.length})</h2>
            {contacts.length === 0 ? <p className="text-muted-foreground text-sm">No contact submissions yet.</p> : (
              <div className="space-y-3">
                {contacts.map(c => (
                  <div key={c.id} className="prayer-card p-4 space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      {c.name && <span className="font-medium text-sm">{c.name}</span>}
                      {c.email && <span className="text-xs text-muted-foreground">{c.email}</span>}
                      <span className="text-xs text-muted-foreground ml-auto">{new Date(c.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="bg-muted/40 rounded-xl px-3 py-2">
                      <p className="text-xs text-muted-foreground mb-1 font-medium">Message</p>
                      <p className="text-sm text-foreground/80">{c.message}</p>
                    </div>
                    {c.ai_reply && (
                      <div className="bg-primary/5 border border-primary/20 rounded-xl px-3 py-2">
                        <p className="text-xs text-primary font-medium mb-1 flex items-center gap-1">
                          ✦ AI Reply {c.replied_at && <span className="text-muted-foreground font-normal">· {new Date(c.replied_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
                        </p>
                        <p className="text-sm text-foreground/80 whitespace-pre-line">{c.ai_reply}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── BLOG TAB ── */}
        {activeTab === "blog" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold">KeepGrow.ing Posts</h2>
              <Button size="sm" className="btn-gold rounded-xl gap-1.5" onClick={() => setShowBlogForm(!showBlogForm)}>
                <PlusCircle className="w-4 h-4" />New Post
              </Button>
            </div>

            {showBlogForm && (
              <div className="prayer-card p-5">
                <h3 className="font-semibold mb-4">Create KeepGrow.ing Post</h3>
                <Form {...blogForm}>
                  <form onSubmit={blogForm.handleSubmit(onBlogSubmit)} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={blogForm.control} name="title" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Title</FormLabel>
                          <FormControl><Input {...field} placeholder="Post title" className="rounded-xl text-sm" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={blogForm.control} name="slug" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Slug</FormLabel>
                          <FormControl><Input {...field} placeholder="post-url-slug" className="rounded-xl text-sm" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={blogForm.control} name="excerpt" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Excerpt</FormLabel>
                        <FormControl><Input {...field} placeholder="Brief description…" className="rounded-xl text-sm" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={blogForm.control} name="cover_image_url" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Cover Image URL</FormLabel>
                        <FormControl><Input {...field} placeholder="https://…" className="rounded-xl text-sm" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={blogForm.control} name="content" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Content (Markdown)</FormLabel>
                        <FormControl><Textarea {...field} placeholder="Write post in Markdown…" rows={8} className="rounded-xl text-sm font-mono resize-none" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={blogForm.control} name="published" render={({ field }) => (
                      <FormItem className="flex items-center gap-3">
                        <input type="checkbox" checked={field.value} onChange={e => field.onChange(e.target.checked)} className="rounded" />
                        <FormLabel className="text-xs">Publish immediately</FormLabel>
                      </FormItem>
                    )} />
                    <div className="flex gap-2">
                      <Button type="submit" className="btn-gold rounded-xl gap-1.5 text-sm">Save Post</Button>
                      <Button type="button" variant="outline" onClick={() => setShowBlogForm(false)} className="rounded-xl text-sm">Cancel</Button>
                    </div>
                  </form>
                </Form>
              </div>
            )}

            {blogPosts.length === 0 ? <p className="text-muted-foreground text-sm">No posts yet. Create your first one!</p> : (
              <div className="space-y-3">
                {blogPosts.map(post => (
                  <div key={post.id} className="prayer-card p-4 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{post.title}</p>
                      <p className="text-xs text-muted-foreground">{new Date(post.created_at).toLocaleDateString()} · /{post.slug}</p>
                    </div>
                    <Badge variant={post.published ? "default" : "secondary"} className="text-xs flex-shrink-0">
                      {post.published ? "Published" : "Draft"}
                    </Badge>
                    <Button size="sm" variant="ghost" className="rounded-lg" onClick={() => togglePublish(post.id, post.published)}>
                      {post.published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── FAQ TAB ── */}
        {activeTab === "faq" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold">AI FAQ Reports</h2>
              <Button size="sm" className="btn-gold rounded-xl gap-1.5" onClick={generateFaq} disabled={genFaq}>
                {genFaq ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Generate Weekly FAQ
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">AI analyzes the last 100 PrayerAssist.ing conversations and summarizes common questions and themes.</p>
            {reports.length === 0 ? <p className="text-sm text-muted-foreground italic">No reports yet. Click "Generate Weekly FAQ" to create the first one.</p> : (
              reports.map(r => (
                <div key={r.id} className="prayer-card p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{r.title}</h3>
                    <span className="text-xs text-muted-foreground">{new Date(r.generated_at).toLocaleDateString()}</span>
                  </div>
                  <div className="prose prose-sm max-w-none text-foreground [&_h2]:font-display [&_h2]:text-base [&_strong]:text-foreground">
                    <ReactMarkdown>{r.content}</ReactMarkdown>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── AI INSIGHTS TAB ── */}
        {activeTab === "insights" && <AIInsightsTab />}

        {/* ── TESTIMONIES TAB ── */}
        {activeTab === "testimonies" && <TestimoniesAdminTab />}

        {/* ── PRAYERS TAB ── */}
        {activeTab === "prayers" && <PrayersAdminTab />}

        {/* ── VERSES TAB ── */}
        {activeTab === "verses" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="font-display text-xl font-semibold">Verse Summaries & Exegesis</h2>
              <span className="text-xs text-muted-foreground">{verseSummaries.length} cached</span>
            </div>
            <p className="text-sm text-muted-foreground">AI-generated verse summaries and in-depth exegeses are cached here to avoid redundant API calls.</p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={verseSearch}
                  onChange={e => setVerseSearch(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") loadVerses(verseSearch); }}
                  placeholder="Search by reference, summary, or exegesis…"
                  className="pl-9 rounded-xl text-sm"
                />
              </div>
              <Button size="sm" className="btn-gold rounded-xl gap-1.5" onClick={() => loadVerses(verseSearch)} disabled={verseSearching}>
                {verseSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Search
              </Button>
              <Button size="sm" variant="outline" className="rounded-xl" onClick={() => { setVerseSearch(""); loadVerses(""); }}>
                Clear
              </Button>
            </div>
            {verseSummaries.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No verse summaries cached yet. They appear automatically when users hover over scripture references.</p>
            ) : (
              <div className="space-y-3">
                {verseSummaries.map(v => {
                  const isEditing = editingVerseId === v.id;
                  return (
                    <div key={v.id} className="prayer-card p-4 space-y-3">
                      {/* Header row */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        {isEditing ? (
                          <Input
                            value={editingVerse.reference ?? ""}
                            onChange={e => setEditingVerse(p => ({ ...p, reference: e.target.value }))}
                            className="rounded-xl text-sm font-semibold text-primary w-40"
                            placeholder="Reference"
                          />
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/15 border border-primary/30">
                            <BookMarked className="w-3.5 h-3.5 text-primary" />
                            <span className="text-xs font-semibold text-primary">{v.reference}</span>
                          </span>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleDateString()}</span>
                          {isEditing ? (
                            <>
                              <Button size="sm" className="btn-gold rounded-xl gap-1.5 h-7 text-xs" onClick={saveVerseEdit} disabled={savingVerse}>
                                {savingVerse ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}Save
                              </Button>
                              <Button size="sm" variant="outline" className="rounded-xl h-7 text-xs gap-1" onClick={() => { setEditingVerseId(null); setEditingVerse({}); }}>
                                <XCircle className="w-3.5 h-3.5" />Cancel
                              </Button>
                            </>
                          ) : (
                            <Button size="sm" variant="ghost" className="rounded-xl h-7 text-xs gap-1" onClick={() => { setEditingVerseId(v.id); setEditingVerse({ reference: v.reference, verse_text: v.verse_text ?? "", summary: v.summary ?? "", exegesis: v.exegesis ?? "" }); }}>
                              <Pencil className="w-3.5 h-3.5" />Edit
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Verse text */}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Verse Text</p>
                        {isEditing ? (
                          <Textarea value={editingVerse.verse_text ?? ""} onChange={e => setEditingVerse(p => ({ ...p, verse_text: e.target.value }))} rows={2} className="rounded-xl text-sm resize-none" placeholder="Verse text…" />
                        ) : (
                          <p className="text-sm text-foreground/80 italic leading-relaxed">{v.verse_text || <span className="text-muted-foreground/50">—</span>}</p>
                        )}
                      </div>

                      {/* Summary */}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Summary</p>
                        {isEditing ? (
                          <Textarea value={editingVerse.summary ?? ""} onChange={e => setEditingVerse(p => ({ ...p, summary: e.target.value }))} rows={3} className="rounded-xl text-sm resize-none" placeholder="Summary…" />
                        ) : (
                          <p className="text-sm text-foreground/80 leading-relaxed">{v.summary || <span className="text-muted-foreground/50">—</span>}</p>
                        )}
                      </div>

                      {/* Exegesis */}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Exegesis</p>
                        {isEditing ? (
                          <Textarea value={editingVerse.exegesis ?? ""} onChange={e => setEditingVerse(p => ({ ...p, exegesis: e.target.value }))} rows={5} className="rounded-xl text-sm resize-none font-body" placeholder="In-depth exegesis…" />
                        ) : (
                          v.exegesis ? (
                            <details className="group">
                              <summary className="text-xs font-medium text-primary cursor-pointer list-none flex items-center gap-1 hover:underline">
                                <span>▶ View Exegesis</span>
                              </summary>
                              <p className="text-sm text-foreground/80 leading-relaxed mt-2 pl-2 border-l-2 border-primary/20">{v.exegesis}</p>
                            </details>
                          ) : <span className="text-sm text-muted-foreground/50">—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>

    {/* AI Enrich panel — opens after admin publishes a new prayer card */}
    {enrichCardId && (
      <AIEnrichPanel
        open={enrichOpen}
        onOpenChange={open => {
          setEnrichOpen(open);
          if (!open) { setEnrichCardId(null); setEnrichCardText(""); setEnrichCardExtended(null); }
        }}
        cardId={enrichCardId}
        prayerText={enrichCardText}
        extendedPrayer={enrichCardExtended}
        existingTags={[]}
        onApplied={() => { load(); setEnrichOpen(false); setEnrichCardId(null); }}
      />
    )}
    </>
  );
}

function PrayersAdminTab() {
  interface AdminPrayer {
    id: string; title: string | null; prayer_text: string;
    extended_prayer: string | null; tags: string[] | null;
    text_style: string | null; background_url: string | null;
    status: string; source: string; created_at: string;
    likes_count: number; prayed_count: number; views: number;
  }

  const [prayers, setPrayers] = useState<AdminPrayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<AdminPrayer> & { tagsRaw?: string }>({});
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const loadPrayers = async (q = "") => {
    setLoading(true);
    let query = supabase
      .from("prayer_cards")
      .select("id,title,prayer_text,extended_prayer,tags,text_style,background_url,status,source,created_at,likes_count,prayed_count,views")
      .eq("source", "admin")
      .order("created_at", { ascending: false });
    if (q.trim()) {
      query = query.or(`title.ilike.%${q}%,prayer_text.ilike.%${q}%`);
    }
    const { data } = await query;
    setPrayers((data as AdminPrayer[]) || []);
    setLoading(false);
  };

  useEffect(() => { loadPrayers(); }, []);

  const startEdit = (p: AdminPrayer) => {
    setEditingId(p.id);
    setEditForm({ ...p, tagsRaw: (p.tags || []).join(", ") });
  };
  const cancelEdit = () => { setEditingId(null); setEditForm({}); };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    const tagsArr = editForm.tagsRaw
      ? editForm.tagsRaw.split(",").map((t: string) => t.trim().toLowerCase().replace(/\s+/g, "-")).filter(Boolean)
      : [];
    const { error } = await supabase.from("prayer_cards").update({
      title: editForm.title || null,
      prayer_text: (editForm.prayer_text || "").trim(),
      extended_prayer: editForm.extended_prayer?.trim() || null,
      tags: tagsArr.length ? tagsArr : null,
      text_style: editForm.text_style || "classic",
      background_url: editForm.background_url || null,
      status: editForm.status || "approved",
    }).eq("id", editingId);
    setSaving(false);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Prayer updated ✓" });
    cancelEdit();
    loadPrayers(searchQuery);
  };

  const deletePrayer = async (id: string) => {
    if (!confirm("Permanently delete this prayer card? This cannot be undone.")) return;
    const { error } = await supabase.from("prayer_cards").delete().eq("id", id);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Prayer deleted" });
    loadPrayers(searchQuery);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-display text-xl font-semibold">Admin Prayer Cards ({prayers.length})</h2>
        <p className="text-xs text-muted-foreground">Only visible to admin. Edit or delete any prayer posted from the admin dashboard.</p>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") loadPrayers(searchQuery); }}
            placeholder="Search by title or prayer text…"
            className="pl-9 rounded-xl text-sm"
          />
        </div>
        <Button size="sm" className="btn-gold rounded-xl gap-1.5" onClick={() => loadPrayers(searchQuery)} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}Search
        </Button>
        <Button size="sm" variant="outline" className="rounded-xl" onClick={() => { setSearchQuery(""); loadPrayers(""); }}>Clear</Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-6">
          <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Loading prayers…</span>
        </div>
      ) : prayers.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No admin prayer cards found.</p>
      ) : (
        <div className="space-y-4">
          {prayers.map(p => {
            const isEditing = editingId === p.id;
            return (
              <div key={p.id} className="prayer-card p-5 space-y-3">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    {!isEditing && (
                      <p className="font-semibold text-sm truncate">{p.title || <span className="text-muted-foreground italic">No title</span>}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</span>
                      <Badge variant={p.status === "approved" ? "default" : "secondary"} className="text-[10px] h-5">{p.status}</Badge>
                      <span className="text-xs text-muted-foreground">❤️ {p.likes_count} · 🙏 {p.prayed_count} · 👁️ {p.views}</span>
                    </div>
                  </div>
                  {/* Actions */}
                  {!isEditing ? (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button size="sm" variant="ghost" className="rounded-xl h-7 text-xs gap-1" onClick={() => startEdit(p)}>
                        <Pencil className="w-3.5 h-3.5" />Edit
                      </Button>
                      <Button size="sm" variant="outline" className="rounded-xl h-7 text-xs gap-1 text-destructive hover:bg-destructive hover:text-destructive-foreground border-destructive/40" onClick={() => deletePrayer(p.id)}>
                        <Trash2 className="w-3.5 h-3.5" />Delete
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button size="sm" className="btn-gold rounded-xl gap-1.5 h-7 text-xs" onClick={saveEdit} disabled={saving}>
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}Save
                      </Button>
                      <Button size="sm" variant="outline" className="rounded-xl h-7 text-xs gap-1" onClick={cancelEdit}>
                        <XCircle className="w-3.5 h-3.5" />Cancel
                      </Button>
                    </div>
                  )}
                </div>

                {/* Edit form or preview */}
                {isEditing ? (
                  <div className="space-y-3 pt-2 border-t border-border">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Title</label>
                        <Input value={editForm.title || ""} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} placeholder="Title (optional)" className="rounded-xl text-sm" maxLength={100} />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Text Style</label>
                        <select
                          value={editForm.text_style || "classic"}
                          onChange={e => setEditForm(f => ({ ...f, text_style: e.target.value }))}
                          className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm"
                        >
                          {TEXT_STYLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Prayer Text <span className="text-destructive">*</span></label>
                      <Textarea value={editForm.prayer_text || ""} onChange={e => setEditForm(f => ({ ...f, prayer_text: e.target.value }))} rows={5} className="rounded-xl text-sm resize-none" maxLength={5000} />
                      <p className="text-xs text-muted-foreground text-right mt-0.5">{(editForm.prayer_text || "").length}/5000</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Scripture / Extended Prayer</label>
                      <Textarea value={editForm.extended_prayer || ""} onChange={e => setEditForm(f => ({ ...f, extended_prayer: e.target.value }))} rows={3} className="rounded-xl text-sm resize-none" maxLength={5000} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Tags (comma-separated)</label>
                        <Input value={editForm.tagsRaw || ""} onChange={e => setEditForm(f => ({ ...f, tagsRaw: e.target.value }))} placeholder="peace, healing, faith" className="rounded-xl text-sm" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
                        <select
                          value={editForm.status || "approved"}
                          onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                          className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm"
                        >
                          <option value="approved">Approved</option>
                          <option value="pending">Pending</option>
                          <option value="rejected">Rejected</option>
                          <option value="private">Private</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Background Image URL</label>
                      <Input value={editForm.background_url || ""} onChange={e => setEditForm(f => ({ ...f, background_url: e.target.value }))} placeholder="https://…" className="rounded-xl text-sm" />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground line-clamp-3">{p.prayer_text}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
function TestimoniesAdminTab() {
  const [flags, setFlags] = useState<{id:string;reason:string|null;created_at:string;testimony_id:string;user_id:string;testimonies:{body:string;prayer_id:string;flagged:boolean}|null}[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("testimony_flags").select("*, testimonies(body,prayer_id,flagged)").order("created_at",{ascending:false}).limit(50);
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
    <div className="space-y-4">
      <h2 className="font-display text-xl font-semibold">Flagged Testimonies ({flags.length})</h2>
      <p className="text-sm text-muted-foreground">Testimonies flagged by users for review.</p>
      {loading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> :
        flags.length === 0 ? <p className="text-sm text-muted-foreground italic">No flagged testimonies 🙏</p> : (
        <div className="space-y-3">
          {flags.map(f => (
            <div key={f.id} className="prayer-card p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">{new Date(f.created_at).toLocaleDateString()}</span>
                <Button size="sm" variant="destructive" className="rounded-xl text-xs h-7" onClick={() => deleteTestimony(f.testimony_id)}>
                  <X className="w-3 h-3" /> Delete
                </Button>
              </div>
              {f.reason && <p className="text-xs text-muted-foreground">Reason: {f.reason}</p>}
              {f.testimonies && <p className="text-sm bg-muted/40 rounded-xl p-3 line-clamp-4">{f.testimonies.body}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
