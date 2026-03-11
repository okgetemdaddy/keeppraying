import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Comments from "@/components/Comments";
import type { Database } from "@/integrations/supabase/types";
import { ArrowLeft, Heart, HandMetal, Bookmark, Share2, Sparkles, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

type PrayerCard = Database['public']['Tables']['prayer_cards']['Row'];

const TEXT_STYLE_CLASSES: Record<string, string> = {
  classic: "font-body text-base",
  scripture: "font-display text-base italic",
  peaceful: "font-body text-base text-muted-foreground",
  bold: "font-body text-base font-semibold",
  gentle: "font-body text-sm leading-relaxed",
  strong: "font-display text-lg font-bold",
  modern: "font-body text-sm tracking-wide",
  compassionate: "font-display text-base",
  whisper: "font-body text-sm text-muted-foreground italic",
  royal: "font-display font-bold tracking-wider",
};

export default function Prayer() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [card, setCard] = useState<PrayerCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [prayed, setPrayed] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data } = await supabase.from("prayer_cards").select("*").eq("id", id).single();
      setCard(data);
      if (data) {
        document.title = `${data.title || data.prayer_text.slice(0, 50)}… | KeepPray.ing`;
        // Increment views
        await supabase.from("prayer_cards").update({ views: (data.views || 0) + 1 }).eq("id", id);
      }
      setLoading(false);
    };
    load();
    return () => { document.title = "KeepPray.ing"; };
  }, [id]);

  useEffect(() => {
    if (!user || !id) return;
    const check = async () => {
      const [{ data: like }, { data: pray }, { data: save }] = await Promise.all([
        supabase.from("likes").select("id").eq("prayer_id", id).eq("user_id", user.id).maybeSingle(),
        supabase.from("prayed_actions").select("id").eq("prayer_id", id).eq("user_id", user.id).maybeSingle(),
        supabase.from("user_saved_prayers").select("id").eq("prayer_id", id).eq("user_id", user.id).maybeSingle(),
      ]);
      setLiked(!!like); setPrayed(!!pray); setSaved(!!save);
    };
    check();
  }, [user, id]);

  const toggleLike = async () => {
    if (!user) { toast({ title: "Sign in to like prayers" }); return; }
    if (liked) { await supabase.from("likes").delete().eq("prayer_id", id!).eq("user_id", user.id); setLiked(false); setCard(c => c ? { ...c, likes_count: c.likes_count - 1 } : c); }
    else { await supabase.from("likes").insert({ prayer_id: id!, user_id: user.id }); setLiked(true); setCard(c => c ? { ...c, likes_count: c.likes_count + 1 } : c); }
  };

  const togglePrayed = async () => {
    if (!user) { toast({ title: "Sign in to track prayers" }); return; }
    if (prayed) { await supabase.from("prayed_actions").delete().eq("prayer_id", id!).eq("user_id", user.id); setPrayed(false); setCard(c => c ? { ...c, prayed_count: c.prayed_count - 1 } : c); }
    else { await supabase.from("prayed_actions").insert({ prayer_id: id!, user_id: user.id }); setPrayed(true); toast({ title: "Prayer recorded 🙏" }); setCard(c => c ? { ...c, prayed_count: c.prayed_count + 1 } : c); }
  };

  const toggleSave = async () => {
    if (!user) { toast({ title: "Sign in to save prayers" }); return; }
    if (saved) { await supabase.from("user_saved_prayers").delete().eq("prayer_id", id!).eq("user_id", user.id); setSaved(false); }
    else { await supabase.from("user_saved_prayers").insert({ prayer_id: id!, user_id: user.id }); setSaved(true); toast({ title: "Saved to your board 📌" }); }
  };

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: card?.title || "A Prayer", url });
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied! 🔗", description: "Share this prayer with someone who needs it." });
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (!card) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <p className="text-muted-foreground font-display italic">Prayer not found.</p>
      <Link to="/prayers"><Button className="btn-gold rounded-xl">Browse Prayers</Button></Link>
    </div>
  );

  const textClass = TEXT_STYLE_CLASSES[card.text_style || "classic"] || TEXT_STYLE_CLASSES.classic;

  return (
    <div className="min-h-screen bg-background">
      {/* Background */}
      {card.background_url && (
        <div className="fixed inset-0 z-0 opacity-10">
          <img src={card.background_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="relative z-10">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
          <div className="container mx-auto px-4 h-14 flex items-center gap-3">
            <Link to="/prayers" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <span className="font-display font-bold text-foreground">KeepPray.ing</span>
            <div className="ml-auto flex items-center gap-2">
              {card.status === "ai_generated" && (
                <span className="tag-pill text-xs"><Sparkles className="w-2.5 h-2.5" />AI Generated</span>
              )}
              <Button size="sm" variant="outline" className="rounded-xl gap-1.5" onClick={share}>
                <Share2 className="w-3.5 h-3.5" />Share
              </Button>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-12 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="prayer-card p-8 space-y-6"
          >
            {card.title && (
              <h1 className="font-display text-3xl font-bold text-foreground">{card.title}</h1>
            )}

            <div className={`${textClass} text-foreground leading-relaxed text-lg whitespace-pre-wrap`}>
              {card.prayer_text}
            </div>

            {card.extended_prayer && (
              <blockquote className="border-l-2 border-primary pl-4 verse-text">
                {card.extended_prayer}
              </blockquote>
            )}

            <div className="flex flex-wrap gap-1.5">
              {card.tags?.map(tag => <span key={tag} className="tag-pill">#{tag}</span>)}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-1 pt-2 border-t border-border">
              <button onClick={toggleLike} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-all hover:bg-accent ${liked ? "text-red-500" : "text-muted-foreground"}`}>
                <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />{card.likes_count}
              </button>
              <button onClick={togglePrayed} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-all hover:bg-accent ${prayed ? "text-primary" : "text-muted-foreground"}`}>
                <HandMetal className="w-4 h-4" />{card.prayed_count} prayed
              </button>
              <button onClick={toggleSave} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-all hover:bg-accent ml-auto ${saved ? "text-primary" : "text-muted-foreground"}`}>
                <Bookmark className={`w-4 h-4 ${saved ? "fill-current" : ""}`} />
                {saved ? "Saved" : "Save"}
              </button>
            </div>

            {/* Comments */}
            <Comments prayerId={card.id} />
          </motion.div>

          <div className="text-center mt-8">
            <p className="verse-text text-sm mb-4 flex items-center justify-center gap-1">"Pray without ceasing." — <VerseLink reference="1 Thessalonians 5:17" text="Pray without ceasing." /></p>
            <Link to="/prayers"><Button variant="outline" className="rounded-xl">Browse More Prayers</Button></Link>
          </div>
        </div>
      </div>
    </div>
  );
}
