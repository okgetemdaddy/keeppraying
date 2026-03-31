import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { SiteNav } from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog as Dialog,
  ResponsiveDialogContent as DialogContent,
  ResponsiveDialogHeader as DialogHeader,
  ResponsiveDialogTitle as DialogTitle,
  ResponsiveDialogDescription as DialogDescription,
} from "@/components/ui/responsive-dialog";
import { Loader2, BookOpen, ArrowRight, Share2, Flag } from "lucide-react";
import { FormattedText } from "@/lib/FormattedText";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface Verse {
  ref: string;
  text: string;
}

interface TestimonyFull {
  id: string;
  body: string;
  title: string | null;
  verses: Verse[];
  praise_count: number;
  is_public: boolean;
  created_at: string;
  user_id: string;
  prayer_id: string | null;
  flagged: boolean;
  profiles?: Profile | null;
  prayer_cards?: {
    id: string;
    title: string | null;
    prayer_text: string;
    labels: string[] | null;
  } | null;
}

function AvatarBubble({ profile }: { profile?: Profile | null }) {
  const initials = profile?.full_name
    ? profile.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";
  if (profile?.avatar_url) {
    return <img src={profile.avatar_url} alt={profile.full_name || ""} className="w-12 h-12 rounded-full object-cover" />;
  }
  return (
    <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm"
      style={{ background: "hsl(42 75% 55%)", color: "white" }}>
      {initials}
    </div>
  );
}

export default function TestimonyDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [testimony, setTestimony] = useState<TestimonyFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [praiseCount, setPraiseCount] = useState(0);
  const [userPraised, setUserPraised] = useState(false);
  const [praiseAnimating, setPraiseAnimating] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("testimonies")
        .select("*")
        .eq("id", id)
        .single();

      if (!data) { setLoading(false); return; }

      // Fetch profile + prayer
      const [{ data: profile }, { data: prayer }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, avatar_url").eq("id", data.user_id).single(),
        data.prayer_id
          ? supabase.from("prayer_cards").select("id, title, prayer_text, labels").eq("id", data.prayer_id).single()
          : { data: null },
      ]);

      // Check user praise
      let praised = false;
      if (user) {
        const { data: praiseData } = await supabase
          .from("testimony_praises")
          .select("id")
          .eq("testimony_id", id)
          .eq("user_id", user.id)
          .maybeSingle();
        praised = !!praiseData;
      }

      const verses = Array.isArray((data as any).verses) ? (data as any).verses : [];
      setTestimony({
        ...data,
        verses,
        title: (data as any).title || null,
        is_public: (data as any).is_public || false,
        praise_count: (data as any).praise_count || 0,
        profiles: profile,
        prayer_cards: prayer,
      } as TestimonyFull);
      setPraiseCount((data as any).praise_count || 0);
      setUserPraised(praised);
      setLoading(false);

      // Set page title
      document.title = `${(data as any).title || "Testimony"} | KeepPray.ing`;
    })();

    return () => { document.title = "KeepPray.ing"; };
  }, [id, user?.id]);

  const togglePraise = async () => {
    if (!user) { toast({ title: "Sign in to praise 🙏" }); return; }
    if (!testimony) return;

    setPraiseAnimating(true);
    setTimeout(() => setPraiseAnimating(false), 400);

    if (userPraised) {
      setUserPraised(false);
      setPraiseCount(c => Math.max(0, c - 1));
      await supabase.from("testimony_praises").delete().eq("testimony_id", testimony.id).eq("user_id", user.id);
      // Also remove saved
      await supabase.from("user_saved_testimonies").delete().eq("testimony_id", testimony.id).eq("user_id", user.id);
    } else {
      // Show save dialog for public testimonies
      if (testimony.is_public && testimony.user_id !== user.id) {
        setSaveDialogOpen(true);
      } else {
        setUserPraised(true);
        setPraiseCount(c => c + 1);
        await supabase.from("testimony_praises").insert({ testimony_id: testimony.id, user_id: user.id } as any);
      }
    }
  };

  const handleSaveDecision = async (save: boolean) => {
    if (!user || !testimony) return;
    setSaveDialogOpen(false);
    setUserPraised(true);
    setPraiseCount(c => c + 1);
    await supabase.from("testimony_praises").insert({ testimony_id: testimony.id, user_id: user.id } as any);
    if (save) {
      await supabase.from("user_saved_testimonies").insert({ testimony_id: testimony.id, user_id: user.id } as any);
      toast({ title: "Testimony saved to your board! 🙌" });
    }
  };

  const handleShare = () => {
    if (!testimony) return;
    navigator.clipboard.writeText(`${window.location.origin}/testimony/${testimony.id}`);
    toast({ title: "Link copied! 🔗" });
  };

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: "hsl(38 60% 97%)" }}>
        <SiteNav />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "hsl(42 75% 45%)" }} />
        </div>
      </div>
    );
  }

  if (!testimony) {
    return (
      <div className="min-h-screen" style={{ background: "hsl(38 60% 97%)" }}>
        <SiteNav />
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <p className="text-4xl">🕊️</p>
          <p className="font-display text-xl font-semibold" style={{ color: "hsl(25 35% 14%)" }}>
            Testimony not found
          </p>
          <Link to="/testify" className="text-sm font-medium" style={{ color: "hsl(42 75% 42%)" }}>
            ← Back to all testimonies
          </Link>
        </div>
      </div>
    );
  }

  const dateStr = new Date(testimony.created_at).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
  const displayName = testimony.profiles?.full_name || "Anonymous";

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, hsl(42 55% 97%) 0%, hsl(38 50% 98%) 100%)" }}>
      <SiteNav />

      <main className="container mx-auto px-4 py-12 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl overflow-hidden"
          style={{
            background: "linear-gradient(145deg, hsl(42 55% 99%) 0%, hsl(38 50% 97%) 100%)",
            boxShadow: "0 4px 24px -6px hsl(42 75% 46% / 0.18), 0 1px 4px -1px rgba(0,0,0,0.06)",
          }}
        >
          {/* Glass sheen */}
          <div className="absolute inset-0 pointer-events-none rounded-2xl"
            style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.04) 50%, transparent 100%)" }} />

          <div className="relative p-6 sm:p-8 space-y-6">
            {/* Author */}
            <div className="flex items-center gap-3">
              <AvatarBubble profile={testimony.profiles} />
              <div>
                <p className="font-semibold" style={{ color: "hsl(25 35% 14%)" }}>{displayName}</p>
                <p className="text-xs" style={{ color: "hsl(25 18% 56%)" }}>{dateStr}</p>
              </div>
            </div>

            {/* Title */}
            {testimony.title && (
              <h1 className="font-display font-bold text-2xl sm:text-3xl leading-tight" style={{ color: "hsl(25 35% 14%)" }}>
                {testimony.title}
              </h1>
            )}

            {/* Body */}
            <FormattedText
              text={testimony.body}
              className="text-base leading-[1.85] font-display"
              style={{ color: "hsl(25 30% 22%)" }}
            />

            {/* Verses */}
            {testimony.verses.length > 0 && (
              <div className="space-y-3 p-4 rounded-xl" style={{ background: "hsl(42 80% 97%)", border: "1px solid hsl(42 75% 55% / 0.2)" }}>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "hsl(42 75% 40%)" }}>
                  Scripture
                </p>
                {testimony.verses.map(v => (
                  <div key={v.ref} className="space-y-1">
                    <p className="text-xs font-bold" style={{ color: "hsl(42 75% 40%)" }}>
                      <BookOpen className="w-3 h-3 inline mr-1" />
                      {v.ref}
                    </p>
                    <p className="text-sm font-display italic leading-relaxed" style={{ color: "hsl(25 28% 28%)" }}>
                      "{v.text}"
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Prayer reference */}
            {testimony.prayer_cards && (
              <Link
                to={`/prayer/${testimony.prayer_cards.id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105 active:scale-95"
                style={{
                  background: "hsl(42 80% 92%)",
                  color: "hsl(38 75% 32%)",
                  boxShadow: "0 1px 4px -1px hsl(42 75% 46% / 0.20)",
                }}
              >
                <BookOpen className="w-3.5 h-3.5" />
                {testimony.prayer_cards.title || "View the original prayer"}
                <ArrowRight className="w-3.5 h-3.5 opacity-60" />
              </Link>
            )}

            {/* Divider */}
            <div className="border-t" style={{ borderColor: "hsl(38 22% 90%)" }} />

            {/* Actions */}
            <div className="flex items-center gap-2">
              <motion.button
                onClick={togglePraise}
                animate={praiseAnimating ? { scale: [1, 1.35, 1] } : {}}
                transition={{ duration: 0.35, type: "spring" }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:bg-accent/40 active:scale-95"
                style={{ color: userPraised ? "hsl(42 75% 40%)" : "hsl(25 18% 58%)" }}
              >
                <span className="text-lg">🙌</span>
                <span>{praiseCount > 0 ? praiseCount : "Praise"}</span>
              </motion.button>

              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-all hover:bg-accent/40"
                style={{ color: "hsl(25 18% 58%)" }}
              >
                <Share2 className="w-4 h-4" />
              </button>

              <div className="flex-1" />

              <Link
                to="/testify"
                className="text-xs font-medium hover:underline underline-offset-2"
                style={{ color: "hsl(42 75% 42%)" }}
              >
                ← All Testimonies
              </Link>
            </div>
          </div>
        </motion.div>
      </main>

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
            <Button
              onClick={() => handleSaveDecision(true)}
              className="flex-1 btn-gold rounded-xl gap-1.5"
            >
              🙌 Yes, save it
            </Button>
            <Button
              onClick={() => handleSaveDecision(false)}
              variant="outline"
              className="flex-1 rounded-xl"
            >
              Just praise
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
