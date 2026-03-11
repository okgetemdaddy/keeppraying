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
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft, Check, X, Loader2, RefreshCw, Users, BookOpen, Mail,
  BarChart2, FileText, PlusCircle, Eye, EyeOff, Sparkles,
} from "lucide-react";
import AIInsightsTab from "@/components/admin/AIInsightsTab";
import UserMonitorTab from "@/components/admin/UserMonitorTab";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const blogSchema = z.object({
  title: z.string().min(3, "Title required"),
  slug: z.string().min(3, "Slug required").regex(/^[a-z0-9-]+$/, "Slug must be lowercase with hyphens only"),
  excerpt: z.string().max(300).optional(),
  content: z.string().min(10, "Content required"),
  cover_image_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  published: z.boolean().default(false),
});
type BlogFormValues = z.infer<typeof blogSchema>;

interface PrayerStat { id: string; title: string | null; prayer_text: string; likes_count: number; prayed_count: number; views: number; }
interface ContactSubmission { id: string; name: string | null; email: string | null; message: string; created_at: string; ai_reply: string | null; replied_at: string | null; }
interface AdminReport { id: string; title: string; content: string; generated_at: string; }
interface BlogPost { id: string; title: string; slug: string; excerpt: string | null; published: boolean | null; created_at: string; }

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
  const [genFaq, setGenFaq] = useState(false);
  const [showBlogForm, setShowBlogForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"moderation" | "stats" | "users" | "contacts" | "blog" | "faq" | "insights">("moderation");
  const { toast } = useToast();

  const blogForm = useForm<BlogFormValues>({
    resolver: zodResolver(blogSchema),
    defaultValues: { title: "", slug: "", excerpt: "", content: "", cover_image_url: "", published: false },
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

  const TABS = [
    { id: "moderation", label: "Moderation", icon: Check },
    { id: "stats", label: "Stats", icon: BarChart2 },
    { id: "users", label: "Users", icon: Users },
    { id: "contacts", label: "Contact", icon: Mail },
    { id: "blog", label: "KeepGrow.ing", icon: BookOpen },
    { id: "faq", label: "FAQ Report", icon: FileText },
    { id: "insights", label: "AI Insights", icon: Sparkles },
  ] as const;

  return (
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
          <div>
            <h2 className="font-display text-xl font-semibold mb-4">Review Queue ({pending.length})</h2>
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
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                <h3 className="font-semibold mb-4">Create Blog Post</h3>
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

            {blogPosts.length === 0 ? <p className="text-muted-foreground text-sm">No blog posts yet. Create your first one!</p> : (
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
            <p className="text-sm text-muted-foreground">AI analyzes the last 100 PrayerAssist conversations and summarizes common questions and themes.</p>
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
      </div>
    </div>
  );
}

