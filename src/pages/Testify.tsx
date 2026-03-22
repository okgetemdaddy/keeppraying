import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/SiteNav";
import {
  Search, X, Loader2, Heart, Share2, Flag, MessageCircle,
  RotateCcw, ChevronDown,
} from "lucide-react";
import { motion as m } from "framer-motion";
import { cn } from "@/lib/utils";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface TestimonyResult {
  id: string;
  prayer_id: string;
  user_id: string;
  body: string;
  flagged: boolean;
  created_at: string;
  profiles?: Profile | null;
  prayer_cards?: {
    id: string;
    title: string | null;
    prayer_text: string;
    tags: string[] | null;
    extended_prayer: string | null;
  } | null;
  likes_count?: number;
  user_liked?: boolean;
  user_flagged?: boolean;
}

function Avatar({ profile }: { profile?: Profile | null }) {
  const initials = profile?.full_name
    ? profile.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";
  if (profile?.avatar_url) {
    return <img src={profile.avatar_url} alt={profile.full_name || ""} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />;
  }
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0"
      style={{ background: "hsl(42 75% 55%)", color: "white" }}>
      {initials}
    </div>
  );
}

function TestimonyFlipCard({ testimony, highlight }: { testimony: TestimonyResult; highlight?: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [flipped, setFlipped] = useState(false);
  const [userLiked, setUserLiked] = useState(testimony.user_liked || false);
  const [likesCount, setLikesCount] = useState(testimony.likes_count || 0);
  const [userFlagged, setUserFlagged] = useState(testimony.user_flagged || false);

  // Auto-highlight if linked
  useEffect(() => { if (highlight) setFlipped(false); }, [highlight]);

  const toggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { toast({ title: "Sign in to like 🙏" }); return; }
    if (userLiked) {
      await supabase.from("testimony_likes").delete().eq("testimony_id", testimony.id).eq("user_id", user.id);
      setUserLiked(false); setLikesCount(c => Math.max(0, c - 1));
    } else {
      await supabase.from("testimony_likes").insert({ testimony_id: testimony.id, user_id: user.id });
      setUserLiked(true); setLikesCount(c => c + 1);
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/testify?t=${testimony.id}`;
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

  const prayer = testimony.prayer_cards;
  const displayName = testimony.profiles?.full_name || "Anonymous";

  return (
    <div
      className="relative"
      style={{ perspective: "1200px", height: "100%", minHeight: 260 }}
    >
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.5, type: "spring", stiffness: 100, damping: 18 }}
        style={{ transformStyle: "preserve-3d", height: "100%", position: "relative" }}
      >
        {/* FRONT — testimony */}
        <div
          className={cn(
            "absolute inset-0 rounded-2xl border overflow-hidden flex flex-col p-5 gap-3",
            highlight && "ring-2"
          )}
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            background: "hsl(var(--card))",
            borderColor: "hsl(38 22% 88%)",
            boxShadow: highlight ? "0 0 0 2px hsl(42 75% 55%)" : "0 2px 16px -4px rgba(0,0,0,0.10)",
          }}
        >
          {/* Author */}
          <div className="flex items-center gap-2.5">
            <Avatar profile={testimony.profiles} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: "hsl(25 35% 14%)" }}>{displayName}</p>
              <p className="text-[10px]" style={{ color: "hsl(25 18% 56%)" }}>
                {new Date(testimony.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>
          </div>

          {/* Prayer title */}
          {prayer?.title && (
            <p className="text-[10px] font-medium px-2 py-1 rounded-lg"
              style={{ background: "hsl(42 80% 92%)", color: "hsl(38 75% 32%)" }}>
              ✦ {prayer.title}
            </p>
          )}

          {/* Testimony excerpt */}
          <p className="text-sm leading-relaxed flex-1" style={{ color: "hsl(25 28% 28%)" }}>
            {testimony.body.length > 300 ? testimony.body.slice(0, 297) + "…" : testimony.body}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-1 pt-2 border-t" style={{ borderColor: "hsl(38 22% 90%)" }}>
            <button
              onClick={toggleLike}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-colors hover:bg-accent/40"
              style={{ color: userLiked ? "hsl(0 72% 51%)" : "hsl(25 18% 56%)" }}
            >
              <Heart className={cn("w-3.5 h-3.5", userLiked && "fill-current")} />
              <span>{likesCount}</span>
            </button>
            <button onClick={handleShare} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-colors hover:bg-accent/40" style={{ color: "hsl(25 18% 56%)" }}>
              <Share2 className="w-3.5 h-3.5" />
            </button>
            {!userFlagged && testimony.user_id !== user?.id && (
              <button onClick={handleFlag} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-colors hover:bg-accent/40" style={{ color: "hsl(25 18% 56%)" }} title="Flag for review">
                <Flag className="w-3.5 h-3.5" />
              </button>
            )}
            <div className="flex-1" />
            {prayer && (
              <button
                onClick={e => { e.stopPropagation(); setFlipped(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                style={{ background: "hsl(42 80% 92%)", color: "hsl(38 75% 32%)" }}
              >
                <RotateCcw className="w-3 h-3" /> See the Prayer 🙏
              </button>
            )}
          </div>
        </div>

        {/* BACK — full prayer */}
        <div
          className="absolute inset-0 rounded-2xl border overflow-hidden flex flex-col p-5 gap-3"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            background: "hsl(42 55% 97%)",
            borderColor: "hsl(38 22% 88%)",
          }}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold" style={{ color: "hsl(42 75% 40%)" }}>The Prayer 🙏</p>
            <button
              onClick={() => setFlipped(false)}
              className="flex items-center gap-1 text-xs transition-colors hover:opacity-70"
              style={{ color: "hsl(25 18% 56%)" }}
            >
              <RotateCcw className="w-3 h-3" /> Back
            </button>
          </div>
          {prayer?.title && (
            <h3 className="font-display font-semibold text-base" style={{ color: "hsl(25 35% 14%)" }}>{prayer.title}</h3>
          )}
          <p className="text-sm leading-relaxed flex-1 overflow-y-auto" style={{ color: "hsl(25 28% 28%)" }}>
            {prayer?.prayer_text}
          </p>
          {prayer?.tags && prayer.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {prayer.tags.map(tag => (
                <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "hsl(42 80% 90%)", color: "hsl(38 75% 35%)" }}>
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

const PAGE_SIZE = 20;

export default function Testify() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [testimonies, setTestimonies] = useState<TestimonyResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const { user } = useAuth();
  const highlightId = searchParams.get("t");

  const fetchTestimonies = useCallback(async (reset = true) => {
    setLoading(true);
    const currentPage = reset ? 0 : page;
    if (reset) setPage(0);

    try {
      let q = supabase
        .from("testimonies")
        .select("*, profiles(id, full_name, avatar_url), prayer_cards(id, title, prayer_text, tags, extended_prayer)")
        .order("created_at", { ascending: false })
        .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

      if (search.trim()) {
        q = q.ilike("body", `%${search.trim()}%`);
      }

      const { data } = await q;

      if (!data) { setLoading(false); return; }
      setHasMore(data.length === PAGE_SIZE);

      // Fetch likes
      const ids = data.map(t => t.id);
      const [{ data: likesData }, { data: flagsData }] = await Promise.all([
        ids.length ? supabase.from("testimony_likes").select("testimony_id, user_id").in("testimony_id", ids) : { data: [] },
        user && ids.length ? supabase.from("testimony_flags").select("testimony_id").in("testimony_id", ids).eq("user_id", user.id) : { data: [] },
      ]);

      const likesMap: Record<string, number> = {};
      const userLikedSet = new Set<string>();
      (likesData || []).forEach((l: { testimony_id: string; user_id: string }) => {
        likesMap[l.testimony_id] = (likesMap[l.testimony_id] || 0) + 1;
        if (l.user_id === user?.id) userLikedSet.add(l.testimony_id);
      });
      const userFlaggedSet = new Set((flagsData || []).map((f: { testimony_id: string }) => f.testimony_id));

      const enriched: TestimonyResult[] = data.map(t => ({
        ...t,
        profiles: Array.isArray(t.profiles) ? t.profiles[0] : t.profiles,
        prayer_cards: Array.isArray(t.prayer_cards) ? t.prayer_cards[0] : t.prayer_cards,
        likes_count: likesMap[t.id] || 0,
        user_liked: userLikedSet.has(t.id),
        user_flagged: userFlaggedSet.has(t.id),
      }));

      setTestimonies(reset ? enriched : prev => [...prev, ...enriched]);
    } finally {
      setLoading(false);
    }
  }, [search, user?.id, page]);

  useEffect(() => { fetchTestimonies(true); }, [search, user?.id]);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setSearch(q);
  }, []);

  const loadMore = async () => {
    const nextPage = page + 1;
    setPage(nextPage);
    setLoading(true);

    let q = supabase
      .from("testimonies")
      .select("*, profiles(id, full_name, avatar_url), prayer_cards(id, title, prayer_text, tags, extended_prayer)")
      .order("created_at", { ascending: false })
      .range(nextPage * PAGE_SIZE, (nextPage + 1) * PAGE_SIZE - 1);
    if (search.trim()) q = q.ilike("body", `%${search.trim()}%`);
    const { data } = await q;

    if (!data) { setLoading(false); return; }
    setHasMore(data.length === PAGE_SIZE);

    const ids = data.map(t => t.id);
    const [{ data: likesData }, { data: flagsData }] = await Promise.all([
      ids.length ? supabase.from("testimony_likes").select("testimony_id, user_id").in("testimony_id", ids) : { data: [] },
      user && ids.length ? supabase.from("testimony_flags").select("testimony_id").in("testimony_id", ids).eq("user_id", user.id) : { data: [] },
    ]);
    const likesMap: Record<string, number> = {};
    const userLikedSet = new Set<string>();
    (likesData || []).forEach((l: { testimony_id: string; user_id: string }) => {
      likesMap[l.testimony_id] = (likesMap[l.testimony_id] || 0) + 1;
      if (l.user_id === user?.id) userLikedSet.add(l.testimony_id);
    });
    const userFlaggedSet = new Set((flagsData || []).map((f: { testimony_id: string }) => f.testimony_id));

    const enriched: TestimonyResult[] = data.map(t => ({
      ...t,
      profiles: Array.isArray(t.profiles) ? t.profiles[0] : t.profiles,
      prayer_cards: Array.isArray(t.prayer_cards) ? t.prayer_cards[0] : t.prayer_cards,
      likes_count: likesMap[t.id] || 0,
      user_liked: userLikedSet.has(t.id),
      user_flagged: userFlaggedSet.has(t.id),
    }));

    setTestimonies(prev => [...prev, ...enriched]);
    setLoading(false);
  };

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, hsl(42 55% 97%) 0%, hsl(38 50% 98%) 100%)" }}>
      <SiteNav />

      {/* Hero */}
      <section className="relative overflow-hidden pt-12 pb-8 sm:pt-16 sm:pb-12">
        <div className="absolute top-0 left-1/4 w-80 h-80 rounded-full blur-3xl pointer-events-none"
          style={{ background: "hsl(42 85% 68% / 0.12)" }} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="container mx-auto px-4 max-w-3xl text-center space-y-4 relative"
        >
          <p className="text-xs tracking-[0.3em] uppercase font-medium" style={{ color: "hsl(42 75% 45%)" }}>
            Answered Prayers
          </p>
          <h1 className="font-display font-bold text-4xl sm:text-5xl leading-tight" style={{ color: "hsl(25 35% 14%)" }}>
            Testify 🕊️
          </h1>
          <p className="text-base sm:text-lg leading-relaxed max-w-xl mx-auto" style={{ color: "hsl(25 28% 42%)" }}>
            Real stories of God answering prayer. Search testimonies, be encouraged, and share your own.
          </p>

          {/* Search bar */}
          <div className="relative max-w-lg mx-auto mt-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "hsl(25 18% 56%)" }} />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search testimonies… (healing, peace, provision…)"
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

      {/* Cards */}
      <main className="container mx-auto px-4 pb-16 max-w-6xl">
        {loading && testimonies.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border p-5 space-y-3 animate-pulse" style={{ background: "hsl(var(--card))", borderColor: "hsl(38 22% 88%)", height: 260 }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full shimmer" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3.5 w-24 rounded shimmer" />
                    <div className="h-2.5 w-16 rounded shimmer" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="h-3 w-full rounded shimmer" />
                  <div className="h-3 w-5/6 rounded shimmer" />
                  <div className="h-3 w-4/5 rounded shimmer" />
                </div>
              </div>
            ))}
          </div>
        ) : testimonies.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20 space-y-4">
            <p className="text-4xl">🕊️</p>
            <p className="font-display text-lg font-semibold" style={{ color: "hsl(25 35% 20%)" }}>
              {search ? "No testimonies found" : "No testimonies yet"}
            </p>
            <p className="text-sm" style={{ color: "hsl(25 18% 56%)" }}>
              {search ? `Try searching for something else, or be the first to testify!` : "Be the first to share how God answered your prayer!"}
            </p>
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
                  style={{ height: 280 }}
                >
                  <TestimonyFlipCard
                    testimony={testimony}
                    highlight={testimony.id === highlightId}
                  />
                </motion.div>
              ))}
            </motion.div>

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center mt-10">
                <Button
                  onClick={loadMore}
                  disabled={loading}
                  variant="outline"
                  className="rounded-2xl gap-2 px-8 h-11"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
                  Load more testimonies
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
