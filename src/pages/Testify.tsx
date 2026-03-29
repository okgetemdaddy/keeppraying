import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SiteNav } from "@/components/SiteNav";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Search, X, Loader2, Share2, Flag, MessageCircle,
  ChevronDown, Bird, ArrowRight, BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FormattedText } from "@/lib/FormattedText";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface TestimonyResult {
  id: string;
  prayer_id: string | null;
  user_id: string;
  body: string;
  flagged: boolean;
  created_at: string;
  profiles?: Profile | null;
  prayer_cards?: {
    id: string;
    title: string | null;
    prayer_text: string;
    labels: string[] | null;
    extended_prayer: string | null;
  } | null;
  likes_count?: number;
  user_liked?: boolean;
  user_flagged?: boolean;
}

function AvatarBubble({ profile, size = "md" }: { profile?: Profile | null; size?: "sm" | "md" }) {
  const initials = profile?.full_name
    ? profile.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";
  const cls = size === "sm" ? "w-6 h-6 text-[9px]" : "w-9 h-9 text-xs";
  if (profile?.avatar_url) {
    return <img src={profile.avatar_url} alt={profile.full_name || ""} className={`${cls} rounded-full object-cover flex-shrink-0`} />;
  }
  return (
    <div className={`${cls} rounded-full flex items-center justify-center font-bold flex-shrink-0`}
      style={{ background: "hsl(42 75% 55%)", color: "white" }}>
      {initials}
    </div>
  );
}

// ── StandaloneTestimonyCard ───────────────────────────────────────────────────
function StandaloneTestimonyCard({
  testimony,
  highlight,
  testimonyCountForPrayer,
}: {
  testimony: TestimonyResult;
  highlight?: boolean;
  testimonyCountForPrayer: number;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [userPraised, setUserPraised] = useState(testimony.user_liked || false);
  const [praiseCount, setPraiseCount] = useState(testimony.likes_count || 0);
  const [userFlagged, setUserFlagged] = useState(testimony.user_flagged || false);
  const [expanded, setExpanded] = useState(false);
  const [prayerOpen, setPrayerOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [praiseAnimating, setPraiseAnimating] = useState(false);

  const TRUNCATE_AT = 480;
  const isLong = testimony.body.length > TRUNCATE_AT;
  const displayBody = expanded || !isLong ? testimony.body : testimony.body.slice(0, TRUNCATE_AT);

  const prayer = testimony.prayer_cards;
  const displayName = testimony.profiles?.full_name || "Anonymous";
  const dateStr = new Date(testimony.created_at).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  const handlePraise = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { toast({ title: "Sign in to praise 🙏" }); return; }
    setPraiseAnimating(true);
    setTimeout(() => setPraiseAnimating(false), 400);
    if (userPraised) {
      setUserPraised(false); setPraiseCount(c => Math.max(0, c - 1));
      await supabase.from("testimony_praises").delete().eq("testimony_id", testimony.id).eq("user_id", user.id);
      await supabase.from("user_saved_testimonies").delete().eq("testimony_id", testimony.id).eq("user_id", user.id);
    } else {
      // Show save dialog
      setSaveDialogOpen(true);
    }
  };

  const handleSaveDecision = async (save: boolean) => {
    if (!user) return;
    setSaveDialogOpen(false);
    setUserPraised(true); setPraiseCount(c => c + 1);
    await supabase.from("testimony_praises").insert({ testimony_id: testimony.id, user_id: user.id } as any);
    if (save) {
      await supabase.from("user_saved_testimonies").insert({ testimony_id: testimony.id, user_id: user.id } as any);
      toast({ title: "Testimony saved to your board! 🙌" });
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/testimony/${testimony.id}`;
    navigator.clipboard.writeText(url).then(() => toast({ title: "Testimony link copied! 🔗" }));
  };

  const handleFlag = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { toast({ title: "Sign in to flag content" }); return; }
    if (userFlagged) return;
    await supabase.from("testimony_flags").insert({ testimony_id: testimony.id, user_id: user.id });
    setUserFlagged(true);
    toast({ title: "Flagged for review. Thank you." });
  };

  return (
    <>
      {/* 2.5D wrapper — perspective on the parent */}
      <div style={{ perspective: "1000px" }} className="h-full">
        <motion.div
          whileHover={{ rotateX: 3, rotateY: -2, scale: 1.012, y: -5 }}
          transition={{ type: "spring", stiffness: 200, damping: 22 }}
          className={cn(
            "relative flex flex-col h-full rounded-2xl overflow-hidden",
            highlight && "ring-2 ring-offset-2"
          )}
          style={{
            transformStyle: "preserve-3d",
            background: "linear-gradient(145deg, hsl(42 55% 99%) 0%, hsl(38 50% 97%) 100%)",
            boxShadow: highlight
              ? "0 0 0 2px hsl(42 75% 55%), 0 8px 40px -8px hsl(42 75% 55% / 0.35), 0 2px 8px -2px rgba(0,0,0,0.08)"
              : "0 4px 24px -6px hsl(42 75% 46% / 0.18), 0 1px 4px -1px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
          }}
        >
          {/* Glass sheen overlay */}
          <div
            className="absolute inset-0 pointer-events-none rounded-2xl"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.04) 50%, transparent 100%)",
            }}
          />

          {/* Decorative gold quote mark */}
          <div
            className="absolute top-2 right-4 font-display font-bold leading-none select-none pointer-events-none"
            style={{ fontSize: "6rem", lineHeight: 1, color: "hsl(42 80% 60% / 0.10)" }}
            aria-hidden
          >
            "
          </div>

          <div className="relative flex flex-col h-full p-5 gap-4">
            {/* Author row */}
            <div className="flex items-center gap-2.5">
              <AvatarBubble profile={testimony.profiles} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: "hsl(25 35% 14%)" }}>{displayName}</p>
                <p className="text-[10px]" style={{ color: "hsl(25 18% 56%)" }}>{dateStr}</p>
              </div>
            </div>

            {/* Testimony body — hero text */}
            <div className="flex-1">
              <FormattedText
                text={testimony.body}
                truncateAt={TRUNCATE_AT}
                expanded={expanded}
                onExpand={() => setExpanded(!expanded)}
                className="font-display leading-[1.75] text-[0.95rem]"
                style={{ color: "hsl(25 30% 22%)" }}
              />
            </div>


            {/* Divider */}
            <div className="border-t" style={{ borderColor: "hsl(38 22% 90%)" }} />

            {/* Actions */}
            <div className="flex items-center gap-0.5">
              <motion.button
                onClick={handlePraise}
                animate={praiseAnimating ? { scale: [1, 1.35, 1] } : {}}
                transition={{ duration: 0.35, type: "spring" }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs transition-all hover:bg-accent/40 active:scale-95"
                style={{ color: userPraised ? "hsl(42 75% 40%)" : "hsl(25 18% 58%)" }}
              >
                <span className="text-base">🙌</span>
                <span className="font-medium">{praiseCount > 0 ? praiseCount : ""}</span>
              </motion.button>

              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs transition-all hover:bg-accent/40 active:scale-95"
                style={{ color: "hsl(25 18% 58%)" }}
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>

              {!userFlagged && testimony.user_id !== user?.id && (
                <button
                  onClick={handleFlag}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs transition-all hover:bg-accent/40 active:scale-95"
                  style={{ color: "hsl(25 18% 58%)" }}
                  title="Flag for review"
                >
                  <Flag className="w-3.5 h-3.5" />
                </button>
              )}

              <div className="flex-1" />

              {/* See the Prayer button — opens sheet */}
              {prayer && (
                <button
                  onClick={e => { e.stopPropagation(); setPrayerOpen(true); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all hover:brightness-95 active:scale-95"
                  style={{ background: "hsl(42 80% 92%)", color: "hsl(38 75% 32%)" }}
                >
                  🙏 See Prayer
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Prayer Sheet */}
      {prayer && (
        <Sheet open={prayerOpen} onOpenChange={setPrayerOpen}>
          <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader className="mb-5">
              <SheetTitle className="font-display text-xl flex items-center gap-2">
                🙏 The Prayer
              </SheetTitle>
              <SheetDescription>
                The prayer this testimony is a response to.
              </SheetDescription>
            </SheetHeader>
            {prayer.title && (
              <h3 className="font-display font-semibold text-lg mb-3" style={{ color: "hsl(25 35% 14%)" }}>{prayer.title}</h3>
            )}
            <p className="text-sm leading-relaxed" style={{ color: "hsl(25 28% 28%)" }}>{prayer.prayer_text}</p>
            {prayer.extended_prayer && (
              <p className="text-sm leading-relaxed mt-4 italic opacity-70" style={{ color: "hsl(25 28% 28%)" }}>{prayer.extended_prayer}</p>
            )}
            {prayer.labels && prayer.labels.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4">
                {prayer.labels.map(tag => (
                  <span key={tag} className="text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{ background: "hsl(42 80% 90%)", color: "hsl(38 75% 35%)" }}>
                    #{tag}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-6">
              <Link
                to={`/prayer/${prayer.id}`}
                className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
                style={{ color: "hsl(42 75% 42%)" }}
                onClick={() => setPrayerOpen(false)}
              >
                View full prayer <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Save dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Save this testimony?</DialogTitle>
            <DialogDescription>
              Would you like to save this testimony to your prayer board?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-2">
            <Button onClick={() => handleSaveDecision(true)} className="flex-1 btn-gold rounded-xl gap-1.5">
              🙌 Yes, save it
            </Button>
            <Button onClick={() => handleSaveDecision(false)} variant="outline" className="flex-1 rounded-xl">
              Just praise
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── TestifySheet — submission form ───────────────────────────────────────────
function TestifySheet({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const textRef = useRef<HTMLTextAreaElement>(null);

  const autoGrow = () => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };

  const handleSubmit = async () => {
    if (!user || !body.trim()) return;
    setSubmitting(true);
    setRejectReason("");
    try {
      const { data: modData } = await supabase.functions.invoke("moderate-testimony", {
        body: { text: body.trim() },
      });
      if (modData && !modData.approved) {
        setRejectReason(modData.reason || "Your testimony couldn't be posted at this time.");
        setSubmitting(false);
        return;
      }
      const { error } = await supabase.from("testimonies").insert({
        user_id: user.id,
        body: body.trim(),
        prayer_id: null,
      });
      if (error) throw error;
      toast({ title: "Your testimony has been shared 🕊️", description: "Thank you for sharing what God has done!" });
      setBody("");
      onOpenChange(false);
      onSuccess();
    } catch {
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto flex flex-col gap-0 p-0">
        {/* Header */}
        <div className="p-6 pb-4 border-b" style={{ borderColor: "hsl(38 22% 90%)" }}>
          <SheetHeader>
            <SheetTitle className="font-display text-2xl flex items-center gap-2">
              <Bird className="w-5 h-5" style={{ color: "hsl(42 75% 45%)" }} />
              Share Your Testimony
            </SheetTitle>
            <SheetDescription className="text-sm leading-relaxed">
              Tell the story of how God moved. This doesn't need to be connected to any specific prayer — just share what He did.
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Form */}
        <div className="flex-1 p-6 space-y-5">
          <div className="relative">
            {/* Decorative quote */}
            <div
              className="absolute top-2 right-3 font-display font-bold leading-none pointer-events-none select-none"
              style={{ fontSize: "4rem", color: "hsl(42 80% 60% / 0.12)" }}
              aria-hidden
            >
              "
            </div>
            <textarea
              ref={textRef}
              value={body}
              onChange={e => { setBody(e.target.value); autoGrow(); }}
              onInput={autoGrow}
              placeholder="Lord answered my prayer when…"
              maxLength={4000}
              rows={8}
              className="w-full resize-none outline-none rounded-2xl text-base leading-[1.85] transition-shadow font-display"
              style={{
                minHeight: 220,
                padding: "1.25rem 1.25rem",
                background: "hsl(42 55% 99%)",
                boxShadow: "inset 0 2px 14px hsl(42 75% 46% / 0.07), 0 0 0 1.5px hsl(38 22% 88%)",
                color: "hsl(25 30% 18%)",
                fontFamily: "inherit",
              }}
              onFocus={e => {
                e.target.style.boxShadow = "inset 0 2px 16px hsl(42 75% 46% / 0.10), 0 0 0 2px hsl(42 75% 55%)";
              }}
              onBlur={e => {
                e.target.style.boxShadow = "inset 0 2px 14px hsl(42 75% 46% / 0.07), 0 0 0 1.5px hsl(38 22% 88%)";
              }}
            />
            <span
              className="absolute bottom-3 right-4 text-[11px] pointer-events-none"
              style={{ color: body.length > 3800 ? "hsl(0 72% 51%)" : "hsl(25 18% 66%)" }}
            >
              {body.length}/4000
            </span>
          </div>

          {rejectReason && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm rounded-xl px-4 py-3"
              style={{ background: "hsl(0 72% 97%)", color: "hsl(0 72% 40%)", border: "1px solid hsl(0 72% 88%)" }}
            >
              {rejectReason}
            </motion.div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={submitting || body.trim().length < 10}
            className="w-full h-12 rounded-2xl text-base gap-2.5 btn-gold"
          >
            {submitting
              ? <><Loader2 className="w-4 h-4 animate-spin" />Reviewing…</>
              : <><Bird className="w-4 h-4" />Share Testimony</>}
          </Button>

          <p className="text-xs text-center" style={{ color: "hsl(25 18% 62%)" }}>
            All testimonies are reviewed before publishing to ensure they honor God.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Page size ─────────────────────────────────────────────────────────────────
const PAGE_SIZE = 20;

// ── Main Testify page ─────────────────────────────────────────────────────────
export default function Testify() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [testimonies, setTestimonies] = useState<TestimonyResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [testifyOpen, setTestifyOpen] = useState(false);

  const highlightId = searchParams.get("t");

  // Open sheet if ?testify=1 (post-auth redirect)
  useEffect(() => {
    if (searchParams.get("testify") === "1" && user) {
      setTestifyOpen(true);
      // Clean the param
      const next = new URLSearchParams(searchParams);
      next.delete("testify");
      setSearchParams(next, { replace: true });
    }
  }, [user]);

  // Compute testimony count per prayer from the loaded set
  const testimonyCountByPrayer = testimonies.reduce<Record<string, number>>((acc, t) => {
    if (t.prayer_id) acc[t.prayer_id] = (acc[t.prayer_id] || 0) + 1;
    return acc;
  }, {});

  const enrichTestimonies = useCallback(async (data: TestimonyResult[]) => {
    const ids = data.map(t => t.id);
    if (!ids.length) return data;
    const [{ data: praisesData }, { data: flagsData }] = await Promise.all([
      supabase.from("testimony_praises").select("testimony_id, user_id").in("testimony_id", ids),
      user ? supabase.from("testimony_flags").select("testimony_id").in("testimony_id", ids).eq("user_id", user.id) : { data: [] },
    ]);
    const praiseMap: Record<string, number> = {};
    const userPraisedSet = new Set<string>();
    (praisesData || []).forEach((p: any) => {
      praiseMap[p.testimony_id] = (praiseMap[p.testimony_id] || 0) + 1;
      if (p.user_id === user?.id) userPraisedSet.add(p.testimony_id);
    });
    const userFlaggedSet = new Set((flagsData || []).map((f: any) => f.testimony_id));
    return data.map(t => ({
      ...t,
      likes_count: praiseMap[t.id] || 0,
      user_liked: userPraisedSet.has(t.id),
      user_flagged: userFlaggedSet.has(t.id),
    }));
  }, [user?.id]);

  const hydrateWithProfiles = async (data: Array<{ user_id: string; prayer_id: string | null; [key: string]: unknown }>) => {
    const userIds = [...new Set(data.map(t => t.user_id))];
    const prayerIds = [...new Set(data.map(t => t.prayer_id).filter(Boolean))] as string[];
    const [{ data: profilesData }, { data: prayerCardsData }] = await Promise.all([
      userIds.length
        ? supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds)
        : { data: [] },
      prayerIds.length
        ? supabase.from("prayer_cards").select("id, title, prayer_text, labels, extended_prayer").in("id", prayerIds)
        : { data: [] },
    ]);
    const profilesMap = Object.fromEntries((profilesData || []).map(p => [p.id, p]));
    const prayerCardsMap = Object.fromEntries((prayerCardsData || []).map(pc => [pc.id, pc]));
    return data.map(t => ({
      ...t,
      profiles: profilesMap[t.user_id] || null,
      prayer_cards: t.prayer_id ? (prayerCardsMap[t.prayer_id] || null) : null,
    }));
  };

  const fetchTestimonies = useCallback(async (reset = true) => {
    setLoading(true);
    const currentPage = reset ? 0 : page;
    if (reset) setPage(0);
    try {
      let q = supabase
        .from("testimonies")
        .select("id, prayer_id, user_id, body, flagged, created_at")
        .order("created_at", { ascending: false })
        .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);
      if (search.trim()) q = q.ilike("body", `%${search.trim()}%`);
      const { data } = await q;
      if (!data) { setLoading(false); return; }
      setHasMore(data.length === PAGE_SIZE);
      const hydrated = await hydrateWithProfiles(data);
      const enriched = await enrichTestimonies(hydrated as TestimonyResult[]);
      setTestimonies(reset ? enriched : prev => [...prev, ...enriched]);
    } finally {
      setLoading(false);
    }
  }, [search, user?.id, enrichTestimonies]);

  useEffect(() => { fetchTestimonies(true); }, [search, user?.id]);

  const loadMore = async () => {
    const nextPage = page + 1;
    setPage(nextPage);
    setLoading(true);
    let q = supabase
      .from("testimonies")
      .select("id, prayer_id, user_id, body, flagged, created_at")
      .order("created_at", { ascending: false })
      .range(nextPage * PAGE_SIZE, (nextPage + 1) * PAGE_SIZE - 1);
    if (search.trim()) q = q.ilike("body", `%${search.trim()}%`);
    const { data } = await q;
    if (!data) { setLoading(false); return; }
    setHasMore(data.length === PAGE_SIZE);
    const hydrated = await hydrateWithProfiles(data);
    const enriched = await enrichTestimonies(hydrated as TestimonyResult[]);
    setTestimonies(prev => [...prev, ...enriched]);
    setLoading(false);
  };

  const handleTestifyClick = () => {
    if (user) {
      setTestifyOpen(true);
    } else {
      sessionStorage.setItem("kp_post_login", JSON.stringify({ path: "/testify?testify=1" }));
      navigate("/auth");
      toast({ title: "Sign in to share your testimony 🕊️", description: "You'll be taken straight to the form after signing in." });
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, hsl(42 55% 97%) 0%, hsl(38 50% 98%) 100%)" }}>
      <SiteNav />

      {/* Hero */}
      <section className="relative overflow-hidden pt-12 pb-8 sm:pt-16 sm:pb-12">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none"
          style={{ background: "hsl(42 85% 68% / 0.10)" }} />
        <div className="absolute top-8 right-1/4 w-64 h-64 rounded-full blur-3xl pointer-events-none"
          style={{ background: "hsl(150 50% 68% / 0.06)" }} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="container mx-auto px-4 max-w-3xl text-center space-y-5 relative"
        >
          <p className="text-xs tracking-[0.3em] uppercase font-medium" style={{ color: "hsl(42 75% 45%)" }}>
            Answered Prayers
          </p>
          <h1 className="font-display font-bold text-4xl sm:text-5xl leading-tight" style={{ color: "hsl(25 35% 14%)" }}>
            Testify 🕊️
          </h1>
          <p className="text-base sm:text-lg leading-relaxed max-w-xl mx-auto" style={{ color: "hsl(25 28% 42%)" }}>
            Real stories of God answering prayer. Read, be encouraged, and share your own story.
          </p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Button
              onClick={handleTestifyClick}
              className="btn-gold h-12 px-8 rounded-2xl text-base gap-2.5 shadow-lg"
              style={{ boxShadow: "0 4px 20px -4px hsl(42 75% 46% / 0.45)" }}
            >
              <Bird className="w-4 h-4" />
              Share Your Testimony
            </Button>
          </motion.div>

          {/* Search bar */}
          <div className="relative max-w-lg mx-auto mt-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "hsl(25 18% 56%)" }} />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search testimonies… healing, peace, provision…"
              className="pl-11 pr-10 h-12 rounded-2xl border-2 text-sm shadow-sm focus-visible:ring-0"
              style={{
                borderColor: search ? "hsl(42 75% 55%)" : "hsl(38 22% 84%)",
                background: "hsl(0 0% 100%)",
                boxShadow: search ? "0 0 0 3px hsl(42 75% 55% / 0.12)" : "0 2px 12px -4px rgba(0,0,0,0.08)",
              }}
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted">
                <X className="w-3.5 h-3.5" style={{ color: "hsl(25 18% 56%)" }} />
              </button>
            )}
          </div>
        </motion.div>
      </section>

      {/* Cards grid */}
      <main className="container mx-auto px-4 pb-16 max-w-6xl">
        {loading && testimonies.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border p-5 space-y-3 animate-pulse" style={{ background: "hsl(var(--card))", borderColor: "hsl(38 22% 88%)", minHeight: 260 }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full shimmer" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-28 rounded shimmer" />
                    <div className="h-2.5 w-18 rounded shimmer" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3.5 w-full rounded shimmer" />
                  <div className="h-3.5 w-5/6 rounded shimmer" />
                  <div className="h-3.5 w-4/5 rounded shimmer" />
                  <div className="h-3.5 w-3/4 rounded shimmer" />
                </div>
              </div>
            ))}
          </div>
        ) : testimonies.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20 space-y-5">
            <p className="text-5xl">🕊️</p>
            <p className="font-display text-xl font-semibold" style={{ color: "hsl(25 35% 20%)" }}>
              {search ? "No testimonies found" : "No testimonies yet"}
            </p>
            <p className="text-sm" style={{ color: "hsl(25 18% 56%)" }}>
              {search ? "Try different words, or share yours!" : "Be the first to share how God answered your prayer!"}
            </p>
            <Button onClick={handleTestifyClick} className="btn-gold rounded-2xl gap-2 mt-2">
              <Bird className="w-4 h-4" /> Share Your Testimony
            </Button>
          </motion.div>
        ) : (
          <>
            {search && (
              <p className="text-sm mb-5" style={{ color: "hsl(25 18% 56%)" }}>
                {testimonies.length}{hasMore ? "+" : ""} {testimonies.length === 1 ? "testimony" : "testimonies"} for "<strong>{search}</strong>"
              </p>
            )}
            <motion.div
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {testimonies.map(testimony => (
                <motion.div
                  key={testimony.id}
                  variants={{ hidden: { opacity: 0, y: 24, scale: 0.97 }, show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } } }}
                >
                  <StandaloneTestimonyCard
                    testimony={testimony}
                    highlight={testimony.id === highlightId}
                    testimonyCountForPrayer={testimony.prayer_id ? (testimonyCountByPrayer[testimony.prayer_id] || 1) : 0}
                  />
                </motion.div>
              ))}
            </motion.div>

            {hasMore && (
              <div className="flex justify-center mt-10">
                <Button
                  onClick={loadMore}
                  disabled={loading}
                  variant="outline"
                  className="rounded-2xl gap-2 px-8 h-11"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
                  Load more
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Testify sheet */}
      <TestifySheet
        open={testifyOpen}
        onOpenChange={setTestifyOpen}
        onSuccess={() => fetchTestimonies(true)}
      />
    </div>
  );
}
