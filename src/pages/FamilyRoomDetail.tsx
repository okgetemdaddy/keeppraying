import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SiteNav } from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import AddPrayerModal from "@/components/AddPrayerModal";
import type { Database } from "@/integrations/supabase/types";
import {
  Home, Copy, Check, ArrowLeft, PlusCircle, Loader2,
  Crown, LogOut, ArrowUpDown, UserMinus, Baby, Users, Shield,
} from "lucide-react";

type PrayerCard = Database["public"]["Tables"]["prayer_cards"]["Row"];
type SortMode = "newest" | "oldest" | "most-prayed";

export default function FamilyRoomDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [room, setRoom] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [prayers, setPrayers] = useState<PrayerCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [sharePrayerId, setSharePrayerId] = useState("");
  const [sharing, setSharing] = useState(false);
  const [userPrayers, setUserPrayers] = useState<PrayerCard[]>([]);
  const [copied, setCopied] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [membersOpen, setMembersOpen] = useState(false);

  const fetchRoom = useCallback(async () => {
    if (!id || !user) return;
    setLoading(true);
    const [{ data: roomData }, { data: memberData }, { data: rpData }] = await Promise.all([
      supabase.from("family_rooms").select("*").eq("id", id).single(),
      supabase.from("family_room_members").select("*, profiles:user_id(full_name, email, avatar_url)").eq("room_id", id),
      supabase.from("family_room_prayers").select("*, prayer_cards(*)").eq("room_id", id).order("created_at", { ascending: false }),
    ]);
    setRoom(roomData);
    setMembers(memberData || []);
    setPrayers((rpData || []).map((r: any) => r.prayer_cards).filter(Boolean));
    setLoading(false);
  }, [id, user]);

  useEffect(() => { fetchRoom(); }, [fetchRoom]);

  // Realtime
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`family-prayers-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "family_room_prayers", filter: `room_id=eq.${id}` }, () => fetchRoom())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, fetchRoom]);

  const loadUserPrayers = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("prayer_cards").select("*").eq("created_by", user.id).order("created_at", { ascending: false }).limit(50);
    setUserPrayers(data || []);
  }, [user]);

  const handleShare = async () => {
    if (!sharePrayerId || !id || !user) return;
    setSharing(true);
    const { error } = await supabase.from("family_room_prayers").insert({ room_id: id, prayer_id: sharePrayerId, shared_by: user.id });
    setSharing(false);
    if (error) {
      toast({ title: error.code === "23505" ? "Already shared" : "Failed to share", variant: "destructive" });
    } else {
      toast({ title: "Prayer shared with family 🏠" });
      setShareOpen(false);
      fetchRoom();
    }
  };

  const handleLeave = async () => {
    if (!id || !user) return;
    await supabase.from("family_room_members").delete().eq("room_id", id).eq("user_id", user.id);
    toast({ title: "Left family room" });
    navigate("/family");
  };

  const toggleChildFriendly = async () => {
    if (!room || room.created_by !== user?.id) return;
    const next = !room.child_friendly;
    await supabase.from("family_rooms").update({ child_friendly: next }).eq("id", room.id);
    setRoom({ ...room, child_friendly: next });
    toast({ title: next ? "Child-friendly mode on 🧸" : "Child-friendly mode off" });
  };

  const copyCode = () => {
    if (!room) return;
    navigator.clipboard.writeText(room.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sortedPrayers = useMemo(() => {
    const items = [...prayers];
    items.sort((a, b) => {
      switch (sortMode) {
        case "newest": return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest": return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "most-prayed": return (b.prayed_count || 0) - (a.prayed_count || 0);
        default: return 0;
      }
    });
    return items;
  }, [prayers, sortMode]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteNav />
        <div className="flex justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-background">
        <SiteNav />
        <div className="text-center py-24 space-y-3">
          <p className="text-muted-foreground">Family room not found.</p>
          <Link to="/family"><Button variant="outline" className="rounded-xl">Back to Family Rooms</Button></Link>
        </div>
      </div>
    );
  }

  const isOwner = room.created_by === user.id;

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Link to="/family" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Family Rooms
        </Link>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="prayer-card p-6 rounded-2xl mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl font-bold text-foreground">{room.name}</h1>
                {isOwner && <Crown className="w-4 h-4 text-primary" />}
                {room.child_friendly && <Baby className="w-4 h-4 text-pink-400" />}
              </div>
              {room.description && <p className="text-sm text-muted-foreground">{room.description}</p>}
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                <button onClick={() => setMembersOpen(true)} className="flex items-center gap-1 hover:text-foreground transition-colors">
                  <Users className="w-3.5 h-3.5" /> {members.length} {members.length === 1 ? "member" : "members"}
                </button>
                <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Private & Encrypted</span>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              {isOwner && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/50">
                  <Baby className="w-3.5 h-3.5 text-pink-400" />
                  <span className="text-xs text-muted-foreground">Kid-safe</span>
                  <Switch checked={room.child_friendly} onCheckedChange={toggleChildFriendly} className="scale-90" />
                </div>
              )}
              <Button variant="outline" size="sm" onClick={copyCode} className="rounded-xl gap-1.5 text-xs">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied!" : "Family Code"}
              </Button>
              {!isOwner && (
                <Button variant="ghost" size="sm" onClick={handleLeave} className="rounded-xl gap-1.5 text-xs text-destructive hover:text-destructive">
                  <LogOut className="w-3.5 h-3.5" /> Leave
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Child-friendly banner */}
        {room.child_friendly && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 rounded-2xl mb-5"
            style={{ background: "hsl(330 60% 96%)", border: "1px solid hsl(330 40% 90%)" }}
          >
            <span className="text-2xl">🧸</span>
            <div>
              <p className="text-sm font-medium" style={{ color: "hsl(330 40% 35%)" }}>Child-Friendly Mode is On</p>
              <p className="text-xs" style={{ color: "hsl(330 30% 50%)" }}>
                Content in this room is gentle and age-appropriate. Perfect for praying with little ones!
              </p>
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <Button onClick={() => setAddOpen(true)} className="btn-gold rounded-xl gap-1.5 h-9 text-sm">
            <PlusCircle className="w-4 h-4" /> New Prayer
          </Button>
          <Button variant="outline" onClick={() => { loadUserPrayers(); setShareOpen(true); setSharePrayerId(""); }} className="rounded-xl gap-1.5 h-9 text-sm">
            <PlusCircle className="w-4 h-4" /> Share Existing
          </Button>
          <div className="ml-auto flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
            <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
              <SelectTrigger className="h-8 rounded-xl text-xs border-border min-w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest" className="text-xs">Newest</SelectItem>
                <SelectItem value="oldest" className="text-xs">Oldest</SelectItem>
                <SelectItem value="most-prayed" className="text-xs">Most prayed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Prayers */}
        {sortedPrayers.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 space-y-3">
            <p className="text-muted-foreground text-sm">No prayers shared yet. Be the first to share!</p>
            <p className="verse-text text-xs">"As for me and my house, we will serve the Lord." — Joshua 24:15</p>
          </motion.div>
        ) : (
          <motion.div layout className={`grid gap-4 ${isMobile ? "grid-cols-1" : "grid-cols-2 lg:grid-cols-3"}`}>
            <AnimatePresence>
              {sortedPrayers.map((card) => (
                <motion.div key={card.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} layout>
                  <Link to={`/prayer/${card.id}`} className="block">
                    <div className="prayer-card p-4 rounded-2xl space-y-2 hover:border-primary/30 border border-transparent transition-all h-full">
                      {card.title && <h3 className="font-display font-semibold text-sm text-foreground line-clamp-1">{card.title}</h3>}
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">{card.prayer_text}</p>
                      {card.labels && card.labels.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {card.labels.slice(0, 3).map((l) => (
                            <span key={l} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">{l}</span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                        <span>🙏 {card.prayed_count}</span>
                        <span>❤️ {card.likes_count}</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Members dialog */}
      <Dialog open={membersOpen} onOpenChange={setMembersOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Family Members</DialogTitle>
            <DialogDescription>{members.length} member{members.length !== 1 && "s"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {members.map((m: any) => {
              const profile = m.profiles;
              return (
                <div key={m.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {(profile?.full_name || profile?.email || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{profile?.full_name || profile?.email || "Member"}</p>
                    <p className="text-xs text-muted-foreground capitalize">{m.role}</p>
                  </div>
                  {isOwner && m.user_id !== user.id && (
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={async () => { await supabase.from("family_room_members").delete().eq("id", m.id); fetchRoom(); }}>
                      <UserMinus className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Share existing prayer */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Share a Prayer</DialogTitle>
            <DialogDescription>Choose one of your prayers to share with the family.</DialogDescription>
          </DialogHeader>
          {userPrayers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">You haven't created any prayers yet.</p>
          ) : (
            <div className="space-y-2">
              {userPrayers.map((p) => (
                <label key={p.id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  sharePrayerId === p.id ? "border-primary bg-accent" : "border-border hover:bg-muted/50"}`}>
                  <input type="radio" name="sharePrayer" className="mt-0.5 accent-primary" checked={sharePrayerId === p.id} onChange={() => setSharePrayerId(p.id)} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{p.title || p.prayer_text.slice(0, 60) + "…"}</p>
                  </div>
                </label>
              ))}
              <Button onClick={handleShare} disabled={!sharePrayerId || sharing} className="w-full btn-gold rounded-xl h-10 gap-2 mt-2">
                {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Share with Family
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AddPrayerModal open={addOpen} onOpenChange={setAddOpen} onSuccess={async (newPrayerId?: string) => {
        if (newPrayerId && id && user) {
          await supabase.from("family_room_prayers").insert({ room_id: id, prayer_id: newPrayerId, shared_by: user.id });
        }
        fetchRoom();
      }} />
    </div>
  );
}
