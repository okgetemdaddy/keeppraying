import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { PrayerCard } from "@/integrations/supabase/types";
import { Heart, HandMetal, Bookmark, Search, Plus, Loader2, Sparkles } from "lucide-react";

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
};

function PrayerCardItem({ card, userId }: { card: PrayerCard; userId: string | null }) {
  const [liked, setLiked] = useState(false);
  const [prayed, setPrayed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) return;
    const checkInteractions = async () => {
      const [{ data: like }, { data: pray }, { data: save }] = await Promise.all([
        supabase.from("likes").select("id").eq("prayer_id", card.id).eq("user_id", userId).maybeSingle(),
        supabase.from("prayed_actions").select("id").eq("prayer_id", card.id).eq("user_id", userId).maybeSingle(),
        supabase.from("user_saved_prayers").select("id").eq("prayer_id", card.id).eq("user_id", userId).maybeSingle(),
      ]);
      setLiked(!!like); setPrayed(!!pray); setSaved(!!save);
    };
    checkInteractions();
  }, [card.id, userId]);

  const toggleLike = async () => {
    if (!userId) { toast({ title: "Sign in to like prayers" }); return; }
    if (liked) { await supabase.from("likes").delete().eq("prayer_id", card.id).eq("user_id", userId); setLiked(false); }
    else { await supabase.from("likes").insert({ prayer_id: card.id, user_id: userId }); setLiked(true); }
  };

  const togglePrayed = async () => {
    if (!userId) { toast({ title: "Sign in to track prayers" }); return; }
    if (prayed) { await supabase.from("prayed_actions").delete().eq("prayer_id", card.id).eq("user_id", userId); setPrayed(false); }
    else { await supabase.from("prayed_actions").insert({ prayer_id: card.id, user_id: userId }); setPrayed(true); toast({ title: "Prayer recorded 🙏" }); }
  };

  const toggleSave = async () => {
    if (!userId) { toast({ title: "Sign in to save prayers" }); return; }
    if (saved) { await supabase.from("user_saved_prayers").delete().eq("prayer_id", card.id).eq("user_id", userId); setSaved(false); }
    else { await supabase.from("user_saved_prayers").insert({ prayer_id: card.id, user_id: userId }); setSaved(true); toast({ title: "Saved to your board 📌" }); }
  };

  const textClass = TEXT_STYLE_CLASSES[card.text_style] || TEXT_STYLE_CLASSES.classic;

  return (
    <div className="prayer-card p-5 space-y-4 flex flex-col">
      {card.title && <h3 className="font-display font-semibold text-foreground text-lg">{card.title}</h3>}
      <p className={`${textClass} text-foreground leading-relaxed flex-1`}>{card.prayer_text}</p>

      {card.extended_prayer && (
        <div>
          <button onClick={() => setExpanded(!expanded)} className="text-xs text-primary hover:underline">{expanded ? "Hide scripture" : "Show scripture +"}</button>
          {expanded && <p className="verse-text text-sm mt-2">{card.extended_prayer}</p>}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {card.tags?.map(tag => <span key={tag} className="tag-pill">#{tag}</span>)}
        {card.status === "ai_generated" && <span className="tag-pill"><Sparkles className="w-2.5 h-2.5" />AI</span>}
      </div>

      <div className="flex items-center gap-1 pt-1 border-t border-border">
        <button onClick={toggleLike} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all hover:bg-accent ${liked ? "text-red-500" : "text-muted-foreground"}`}>
          <Heart className={`w-3.5 h-3.5 ${liked ? "fill-current" : ""}`} />{card.likes_count}
        </button>
        <button onClick={togglePrayed} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all hover:bg-accent ${prayed ? "text-primary" : "text-muted-foreground"}`}>
          <HandMetal className="w-3.5 h-3.5" />{card.prayed_count}
        </button>
        <button onClick={toggleSave} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all hover:bg-accent ml-auto ${saved ? "text-primary" : "text-muted-foreground"}`}>
          <Bookmark className={`w-3.5 h-3.5 ${saved ? "fill-current" : ""}`} />
        </button>
      </div>
    </div>
  );
}

export default function Prayers() {
  const [cards, setCards] = useState<PrayerCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState("");
  const { user } = useAuth();

  const popularTags = ["daily-prayer", "peace", "faith", "morning-prayer", "healing", "forgiveness", "lords-prayer", "intercession"];

  const fetchPrayers = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("prayer_cards").select("*").in("status", ["approved", "ai_generated"]).order("likes_count", { ascending: false });
    if (activeTag) q = q.contains("tags", [activeTag]);
    if (search) q = q.textSearch("prayer_text", search, { type: "websearch" });
    const { data } = await q.limit(50);
    setCards(data || []);
    setLoading(false);
  }, [search, activeTag]);

  useEffect(() => { fetchPrayers(); }, [fetchPrayers]);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="font-display font-bold text-xl text-foreground">KeepPray.ing</Link>
          <div className="flex items-center gap-2">
            <Link to="/assistant"><Button variant="outline" size="sm" className="rounded-xl gap-1.5"><Sparkles className="w-3.5 h-3.5" />PrayerAssist</Button></Link>
            {user ? <Link to="/board"><Button size="sm" className="btn-gold rounded-xl">My Board</Button></Link>
              : <Link to="/auth"><Button size="sm" className="btn-gold rounded-xl">Sign In</Button></Link>}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="font-display text-4xl font-bold text-foreground">Prayer Collections</h1>
          <p className="text-muted-foreground">Discover prayers to strengthen your faith journey</p>
        </div>

        {/* Search */}
        <div className="relative max-w-xl mx-auto">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search prayers…" className="pl-10 rounded-2xl h-11" />
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 justify-center">
          <button onClick={() => setActiveTag("")} className={`tag-pill cursor-pointer transition-all ${!activeTag ? "ring-2 ring-primary" : ""}`}>All</button>
          {popularTags.map(t => (
            <button key={t} onClick={() => setActiveTag(activeTag === t ? "" : t)} className={`tag-pill cursor-pointer transition-all ${activeTag === t ? "ring-2 ring-primary" : ""}`}>#{t}</button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-64 rounded-2xl shimmer" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map(card => <PrayerCardItem key={card.id} card={card} userId={user?.id ?? null} />)}
          </div>
        )}

        {!loading && cards.length === 0 && (
          <div className="text-center py-16 space-y-4">
            <p className="text-muted-foreground font-display italic">No prayers found.</p>
            <Link to="/assistant"><Button className="btn-gold rounded-xl gap-2"><Sparkles className="w-4 h-4" />Generate a prayer with AI</Button></Link>
          </div>
        )}
      </div>
    </div>
  );
}
