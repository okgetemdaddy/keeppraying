import { useState } from "react";
import SacredSpinner from "@/components/SacredSpinner";
import { Link, useNavigate } from "react-router-dom";
import VerseLink from "@/components/VerseLink";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useAccountabilityCircles } from "@/hooks/useAccountabilityCircles";
import { useToast } from "@/hooks/use-toast";
import { SiteNav } from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import {
  Heart, Users, Plus, Loader2, ArrowRight, Link2, Sparkles, Shield,
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
  const [inviteCode, setInviteCode] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!user || !name.trim()) return;
    setSaving(true);
    try {
      const { data: circle, error } = await supabase
        .from("accountability_circles")
        .insert({ name: name.trim(), description: description.trim() || null, created_by: user.id } as any)
        .select("id")
        .single();
      if (error) throw error;

      // Auto-join as owner
      await supabase.from("accountability_circle_members").insert({
        circle_id: (circle as any).id, user_id: user.id, role: "owner",
      } as any);

      toast({ title: "Circle created 🕊️", description: "Share the invite code with your closest friends." });
      setName(""); setDescription(""); setCreateOpen(false);
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
        .select("id, max_members")
        .eq("invite_code", inviteCode.trim().toLowerCase())
        .single();
      if (!circle) { toast({ title: "Circle not found", description: "Check your invite code and try again.", variant: "destructive" }); setSaving(false); return; }

      // Check member count
      const { count } = await supabase
        .from("accountability_circle_members")
        .select("id", { count: "exact", head: true })
        .eq("circle_id", (circle as any).id);
      if ((count ?? 0) >= (circle as any).max_members) {
        toast({ title: "Circle is full", description: "This circle has reached its maximum of 5 members.", variant: "destructive" });
        setSaving(false); return;
      }

      const { error } = await supabase.from("accountability_circle_members").insert({
        circle_id: (circle as any).id, user_id: user.id,
      } as any);
      if (error) {
        if (error.code === "23505") toast({ title: "Already a member", description: "You're already in this circle." });
        else throw error;
        setSaving(false); return;
      }

      toast({ title: "Joined! 🤝", description: "You've joined the accountability circle." });
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
      <div className="flex-1 container mx-auto px-4 py-8 max-w-2xl space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-400/20 to-amber-400/20 flex items-center justify-center mx-auto border border-rose-300/20">
            <Shield className="w-8 h-8" style={{ color: "hsl(340 55% 55%)" }} />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">Accountability Circles</h1>
          <p className="text-muted-foreground max-w-md mx-auto text-sm leading-relaxed">
            A gentle, private space for 3–5 trusted friends to share prayer journeys,
            encourage one another, and grow together in faith.
          </p>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-3 justify-center"
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
              "As iron sharpens iron, so one person sharpens another." — <VerseLink reference="Proverbs 27:17" />
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            {circles.map((circle, i) => (
              <motion.div
                key={circle.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <Link to={`/circles/${circle.id}`}>
                  <div className="prayer-card rounded-2xl p-5 hover:shadow-lg transition-all group cursor-pointer">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors">
                          {circle.name}
                        </h3>
                        {circle.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{circle.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Users className="w-3 h-3" /> {circle.memberCount} / {circle.max_members}
                          </span>
                          {circle.ai_encouragement && (
                            <span className="text-xs flex items-center gap-1" style={{ color: "hsl(42 75% 45%)" }}>
                              <Sparkles className="w-3 h-3" /> AI encouragement
                            </span>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}

        <p className="verse-text text-xs text-center pt-4">
          "Carry each other's burdens, and in this way you will fulfill the law of Christ." — <VerseLink reference="Galatians 6:2" />
        </p>
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Create an Accountability Circle</DialogTitle>
            <DialogDescription>A private space for 3–5 trusted friends to grow together.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Circle Name</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Faith Brothers" className="rounded-xl mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Description (optional)</label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="What binds your circle together?" className="rounded-xl mt-1" />
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
            <DialogTitle className="font-display">Join an Accountability Circle</DialogTitle>
            <DialogDescription>Enter the invite code shared by a friend.</DialogDescription>
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
