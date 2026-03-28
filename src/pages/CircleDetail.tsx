import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import VerseLink from "@/components/VerseLink";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useCircleDetail } from "@/hooks/useAccountabilityCircles";
import { useToast } from "@/hooks/use-toast";
import { SiteNav } from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Copy, Users, Heart, Flame, Sparkles, Loader2,
  Share2, LogOut, Trash2, Shield, ChevronDown, BookOpen,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export default function CircleDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { circle, members, prayers, encouragements, loading, stats, refetch } = useCircleDetail(id);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [shareOpen, setShareOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [encourageLoading, setEncourageLoading] = useState(false);
  const [selectedPrayerId, setSelectedPrayerId] = useState("");
  const [userPrayers, setUserPrayers] = useState<{ id: string; title: string | null; prayer_text: string }[]>([]);
  const [sharePrayerOpen, setSharePrayerOpen] = useState(false);
  const [sharingPrayer, setSharingPrayer] = useState(false);

  const isOwner = circle?.created_by === user?.id;

  const copyInvite = () => {
    if (!circle) return;
    navigator.clipboard.writeText(circle.invite_code);
    toast({ title: "Invite code copied! 📋", description: `Share "${circle.invite_code}" with a friend.` });
  };

  const handleLeave = async () => {
    if (!user || !id) return;
    await supabase.from("accountability_circle_members").delete().eq("circle_id", id).eq("user_id", user.id);
    toast({ title: "You've left the circle" });
    navigate("/circles");
  };

  const handleDelete = async () => {
    if (!id) return;
    await supabase.from("accountability_circles").delete().eq("id", id);
    toast({ title: "Circle deleted" });
    navigate("/circles");
  };

  const loadUserPrayers = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("prayer_cards")
      .select("id, title, prayer_text")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setUserPrayers((data || []) as any);
    setSharePrayerOpen(true);
  };

  const sharePrayer = async () => {
    if (!user || !id || !selectedPrayerId) return;
    setSharingPrayer(true);
    try {
      const { error } = await supabase.from("accountability_circle_prayers").insert({
        circle_id: id, prayer_id: selectedPrayerId, shared_by: user.id,
      } as any);
      if (error) throw error;
      toast({ title: "Prayer shared with circle 🙏" });
      setSharePrayerOpen(false);
      setSelectedPrayerId("");
      refetch();
    } catch {
      toast({ title: "Could not share prayer", variant: "destructive" });
    } finally { setSharingPrayer(false); }
  };

  const requestEncouragement = async () => {
    if (!id) return;
    setEncourageLoading(true);
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/circle-encouragement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ circleId: id }),
      });
      if (!resp.ok) throw new Error("Failed");
      toast({ title: "Encouragement generated ✨" });
      refetch();
    } catch {
      toast({ title: "Could not generate encouragement", variant: "destructive" });
    } finally { setEncourageLoading(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (!circle) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <p className="text-muted-foreground font-display italic">Circle not found.</p>
      <Link to="/circles"><Button className="btn-gold rounded-xl">Back to Circles</Button></Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        {/* Back */}
        <Link to="/circles" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Circles
        </Link>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">{circle.name}</h1>
              {circle.description && <p className="text-sm text-muted-foreground mt-1">{circle.description}</p>}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShareOpen(true)} className="rounded-xl gap-1.5">
                <Share2 className="w-4 h-4" /> Invite
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Positive aggregate stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="grid grid-cols-3 gap-3"
        >
          <div className="prayer-card rounded-2xl p-4 text-center">
            <Heart className="w-5 h-5 mx-auto mb-1" style={{ color: "hsl(340 55% 55%)" }} />
            <p className="font-display text-xl font-bold text-foreground">{stats.totalPrayed}</p>
            <p className="text-[10px] text-muted-foreground">times prayed</p>
          </div>
          <div className="prayer-card rounded-2xl p-4 text-center">
            <BookOpen className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="font-display text-xl font-bold text-foreground">{stats.totalPrayers}</p>
            <p className="text-[10px] text-muted-foreground">shared prayers</p>
          </div>
          <div className="prayer-card rounded-2xl p-4 text-center">
            <Flame className="w-5 h-5 mx-auto mb-1" style={{ color: "hsl(25 90% 55%)" }} />
            <p className="font-display text-xl font-bold text-foreground">{stats.avgStreak}</p>
            <p className="text-[10px] text-muted-foreground">avg streak</p>
          </div>
        </motion.div>

        {/* Members */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }}>
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Members ({members.length}/{circle.max_members})
          </h2>
          <div className="flex flex-wrap gap-3">
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50">
                <div className="w-7 h-7 rounded-full bg-gradient-gold flex items-center justify-center text-white text-xs font-bold">
                  {m.profile?.full_name?.[0]?.toUpperCase() || "?"}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground leading-tight">{m.profile?.full_name || "Friend"}</p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Flame className="w-2.5 h-2.5" style={{ color: "hsl(25 90% 55%)" }} />
                    {m.profile?.current_streak || 0} day streak
                    {m.role === "owner" && <span className="ml-1 text-primary">· Owner</span>}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Share prayer button */}
        <Button onClick={loadUserPrayers} variant="outline" className="rounded-xl gap-2 w-full">
          <Heart className="w-4 h-4" /> Share a Prayer with Circle
        </Button>

        {/* Shared prayers */}
        {prayers.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.16 }} className="space-y-3">
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Shared Prayers</h2>
            {prayers.map((cp) => (
              <Link key={cp.id} to={`/prayer/${cp.prayer_id}`}>
                <div className="prayer-card rounded-2xl p-4 hover:shadow-md transition-shadow cursor-pointer">
                  {cp.prayer?.title && (
                    <h3 className="font-display font-semibold text-sm text-foreground mb-1">{cp.prayer.title}</h3>
                  )}
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {cp.prayer?.prayer_text || "Prayer"}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">🙏 {cp.prayer?.prayed_count || 0}</span>
                    <span className="flex items-center gap-1">❤️ {cp.prayer?.likes_count || 0}</span>
                  </div>
                </div>
              </Link>
            ))}
          </motion.div>
        )}

        {/* AI Encouragements */}
        {circle.ai_encouragement && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" style={{ color: "hsl(42 75% 45%)" }} /> Weekly Encouragement
              </h2>
              <Button variant="ghost" size="sm" onClick={requestEncouragement} disabled={encourageLoading} className="rounded-xl text-xs gap-1">
                {encourageLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                Generate
              </Button>
            </div>

            {encouragements.length > 0 ? (
              encouragements.slice(0, 3).map(enc => (
                <div key={enc.id} className="rounded-2xl p-4 border border-primary/10 bg-primary/[0.03]">
                  <p className="text-sm text-foreground leading-relaxed">{enc.content}</p>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    {new Date(enc.generated_at).toLocaleDateString()}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground italic">No encouragements yet — generate one above.</p>
            )}
          </motion.div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-border">
          {!isOwner && (
            <Button variant="ghost" onClick={() => setLeaveOpen(true)} className="rounded-xl gap-1.5 text-destructive">
              <LogOut className="w-4 h-4" /> Leave Circle
            </Button>
          )}
          {isOwner && (
            <Button variant="ghost" onClick={() => setDeleteOpen(true)} className="rounded-xl gap-1.5 text-destructive">
              <Trash2 className="w-4 h-4" /> Delete Circle
            </Button>
          )}
        </div>

        <p className="verse-text text-xs text-center pt-2">
          "Therefore encourage one another and build each other up." — <VerseLink reference="1 Thessalonians 5:11" />
        </p>
      </div>

      {/* Share invite dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Invite a Friend</DialogTitle>
            <DialogDescription>Share this code with someone you trust.</DialogDescription>
          </DialogHeader>
          <div className="text-center space-y-4 pt-2">
            <div className="bg-muted rounded-xl p-4">
              <p className="font-mono text-2xl tracking-[0.3em] text-foreground font-bold select-all">
                {circle?.invite_code}
              </p>
            </div>
            <Button onClick={copyInvite} className="btn-gold rounded-xl gap-2 w-full">
              <Copy className="w-4 h-4" /> Copy Code
            </Button>
            <p className="text-xs text-muted-foreground">Max {circle?.max_members} members per circle</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share prayer dialog */}
      <Dialog open={sharePrayerOpen} onOpenChange={setSharePrayerOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Share a Prayer</DialogTitle>
            <DialogDescription>Choose a prayer from your board to share with the circle.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Select value={selectedPrayerId} onValueChange={setSelectedPrayerId}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Select a prayer…" />
              </SelectTrigger>
              <SelectContent>
                {userPrayers.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title || p.prayer_text.slice(0, 50) + "…"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={sharePrayer} disabled={sharingPrayer || !selectedPrayerId} className="btn-gold rounded-xl w-full gap-2">
              {sharingPrayer ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4" />}
              Share with Circle
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Leave dialog */}
      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Leave this circle?</DialogTitle>
            <DialogDescription>You can rejoin later with the invite code.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setLeaveOpen(false)} className="rounded-xl flex-1">Cancel</Button>
            <Button variant="destructive" onClick={handleLeave} className="rounded-xl flex-1">Leave</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete this circle?</DialogTitle>
            <DialogDescription>This will remove the circle and all shared prayers permanently.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} className="rounded-xl flex-1">Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} className="rounded-xl flex-1">Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
