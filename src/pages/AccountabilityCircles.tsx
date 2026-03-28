import { useState } from "react";
import SacredSpinner from "@/components/SacredSpinner";
import { Link, useNavigate } from "react-router-dom";
import VerseLink from "@/components/VerseLink";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useAccountabilityCircles } from "@/hooks/useAccountabilityCircles";
import { useBackLink } from "@/hooks/useBackLink";
import { useToast } from "@/hooks/use-toast";
import { SiteNav } from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, Users, Plus, Loader2, ArrowRight, Link2, Sparkles, Shield,
  Crown, ChevronRight, Globe, Lock,
} from "lucide-react";

export default function AccountabilityCircles() {
  const { user } = useAuth();
  const { circles, loading, refetch } = useAccountabilityCircles();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [purpose, setPurpose] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!user || !name.trim()) return;
    setSaving(true);
    try {
      const { data: circle, error } = await supabase
        .from("accountability_circles")
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          purpose: purpose.trim() || null,
          is_public: isPublic,
          created_by: user.id,
        } as any)
        .select("id")
        .single();
      if (error) throw error;

      await supabase.from("accountability_circle_members").insert({
        circle_id: (circle as any).id, user_id: user.id, role: "owner",
      } as any);

      toast({ title: "Circle created 🕊️", description: "Share the invite code with your group." });
      setName(""); setDescription(""); setPurpose(""); setIsPublic(false); setCreateOpen(false);
      refetch();
      navigate(`/circles/${(circle as any).id}`);
    } catch (e) {
      toast({ title: "Could not create circle", description: e instanceof Error ? e.message : "Please try again.", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleJoin = async () => {
    if (!user || !inviteCode.trim()) return;
    setSaving(true);
    try {
      const { data: circle } = await supabase
        .from("accountability_circles")
        .select("id")
        .eq("invite_code", inviteCode.trim().toLowerCase())
        .single();
      if (!circle) { toast({ title: "Circle not found", description: "Check your invite code and try again.", variant: "destructive" }); setSaving(false); return; }

      const { error } = await supabase.from("accountability_circle_members").insert({
        circle_id: (circle as any).id, user_id: user.id,
      } as any);
      if (error) {
        if (error.code === "23505") toast({ title: "Already a member", description: "You're already in this circle." });
        else throw error;
        setSaving(false); return;
      }

      toast({ title: "Joined! 🤝", description: "Welcome to the circle." });
      setInviteCode(""); setJoinOpen(false);
      refetch();
      navigate(`/circles/${(circle as any).id}`);
    } catch (e) {
      toast({ title: "Could not join circle", variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteNav />
      <div className="flex-1 container mx-auto px-4 py-8 max-w-3xl space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="w-16 h-16 rounded-full bg-gradient-gold flex items-center justify-center mx-auto shadow-gold">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">Prayer Circles</h1>
          <p className="text-muted-foreground max-w-md mx-auto text-sm leading-relaxed">
            Gather with friends, small groups, and accountability partners.
            Share prayers, set schedules, assign homework, and grow together in faith.
          </p>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-3 justify-center flex-wrap"
        >
          <Button onClick={() => setCreateOpen(true)} className="btn-gold rounded-xl gap-2">
            <Plus className="w-4 h-4" /> Create Circle
          </Button>
          <Button onClick={() => setJoinOpen(true)} variant="outline" className="rounded-xl gap-2">
            <Link2 className="w-4 h-4" /> Join with Code
          </Button>
        </motion.div>

        {/* Circles list */}
        {loading ? (
          <SacredSpinner />
        ) : circles.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 space-y-4"
          >
            <Heart className="w-10 h-10 mx-auto text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">
              You're not in any circles yet. Create one or join with an invite code.
            </p>
            <p className="verse-text text-xs">
              "For where two or three gather in my name, there am I with them." — <VerseLink reference="Matthew 18:20" />
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            <AnimatePresence>
              {circles.map((circle, i) => (
                <motion.div
                  key={circle.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link to={`/circles/${circle.id}`}>
                    <div className="prayer-card rounded-2xl p-5 hover:shadow-lg hover:border-primary/30 border border-transparent transition-all group cursor-pointer flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: "linear-gradient(135deg, hsl(42 80% 50% / 0.15), hsl(42 80% 50% / 0.05))" }}
                      >
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                            {circle.name}
                          </h3>
                          {circle.role === "owner" && <Crown className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                          {circle.is_public ? (
                            <Globe className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          ) : (
                            <Lock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          )}
                        </div>
                        {(circle.purpose || circle.description) && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {circle.purpose || circle.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Users className="w-3 h-3" /> {circle.memberCount} members
                          </span>
                          {circle.ai_encouragement && (
                            <span className="text-xs flex items-center gap-1" style={{ color: "hsl(42 75% 45%)" }}>
                              <Sparkles className="w-3 h-3" /> AI
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        <p className="verse-text text-xs text-center pt-4">
          "As iron sharpens iron, so one person sharpens another." — <VerseLink reference="Proverbs 27:17" />
        </p>

        {backLink && (
          <div className="text-center pt-10">
            <Link to={backLink.to} className="text-xs text-muted-foreground hover:text-primary transition-colors">
              ← {backLink.label}
            </Link>
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> Create a Prayer Circle
            </DialogTitle>
            <DialogDescription>Start a new circle for prayer, accountability, and spiritual growth.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Circle Name</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Wednesday Night Bible Study" className="rounded-xl mt-1" maxLength={80} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Purpose</label>
              <Input value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="e.g. Weekly prayer & scripture study" className="rounded-xl mt-1" maxLength={200} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Description (optional)</label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Tell members what this circle is about…" className="rounded-xl mt-1 resize-none" rows={2} maxLength={300} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
              <div className="flex items-center gap-2">
                {isPublic ? <Globe className="w-4 h-4 text-primary" /> : <Lock className="w-4 h-4 text-muted-foreground" />}
                <div>
                  <p className="text-sm font-medium text-foreground">{isPublic ? "Public Circle" : "Private Circle"}</p>
                  <p className="text-xs text-muted-foreground">{isPublic ? "Anyone can discover and request to join" : "Invite-only with a secret code"}</p>
                </div>
              </div>
              <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            </div>
            <Button onClick={handleCreate} disabled={saving || !name.trim()} className="btn-gold rounded-xl w-full gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create Circle
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Join dialog */}
      <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Join a Circle</DialogTitle>
            <DialogDescription>Enter the invite code shared by a friend or leader.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value)}
              placeholder="Enter invite code"
              className="rounded-xl font-mono text-center tracking-widest"
              onKeyDown={e => { if (e.key === "Enter") handleJoin(); }}
            />
            <Button onClick={handleJoin} disabled={saving || !inviteCode.trim()} className="btn-gold rounded-xl w-full gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
              Join Circle
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
