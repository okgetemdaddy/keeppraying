import { useState } from "react";
import VerseLink from "@/components/VerseLink";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePrayerGroups } from "@/hooks/usePrayerGroups";
import { SiteNav } from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Users, Plus, KeyRound, Loader2, Crown, ChevronRight,
} from "lucide-react";

export default function Groups() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { groups, loading, createGroup, joinByCode } = usePrayerGroups();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!user) {
    navigate("/auth", { replace: true });
    return null;
  }

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    const group = await createGroup(name.trim(), desc.trim());
    setSubmitting(false);
    if (group) {
      toast({ title: `"${name}" created! 🙏`, description: "Share the invite code with your group." });
      setCreateOpen(false);
      setName("");
      setDesc("");
      navigate(`/groups/${group.id}`);
    } else {
      toast({ title: "Failed to create group", variant: "destructive" });
    }
  };

  const handleJoin = async () => {
    if (!code.trim()) return;
    setSubmitting(true);
    const result = await joinByCode(code.trim());
    setSubmitting(false);
    if (result.error) {
      toast({ title: result.error, variant: "destructive" });
    } else {
      toast({ title: "Joined group! 🎉" });
      setJoinOpen(false);
      setCode("");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 space-y-3"
        >
          <div className="w-14 h-14 rounded-full bg-gradient-gold flex items-center justify-center mx-auto shadow-gold">
            <Users className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">Prayer Groups</h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Pray together with friends, small groups, and Bible studies.
            Share prayers, encourage one another, and grow in faith as a community.
          </p>
        </motion.div>

        {/* Action buttons */}
        <div className={`flex gap-3 mb-8 ${isMobile ? "flex-col" : "justify-center"}`}>
          <Button
            onClick={() => setCreateOpen(true)}
            className="btn-gold rounded-xl gap-2 h-11"
          >
            <Plus className="w-4 h-4" /> Create Prayer Group
          </Button>
          <Button
            variant="outline"
            onClick={() => setJoinOpen(true)}
            className="rounded-xl gap-2 h-11"
          >
            <KeyRound className="w-4 h-4" /> Join with Invite Code
          </Button>
        </div>

        {/* Groups list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : groups.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 space-y-4"
          >
            <p className="text-muted-foreground text-sm">
              You haven't joined any groups yet.
            </p>
            <p className="verse-text text-xs">
              "For where two or three gather in my name, there am I with them." — <VerseLink reference="Matthew 18:20" />
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {groups.map((group, i) => (
                <motion.button
                  key={group.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => navigate(`/groups/${group.id}`)}
                  className="w-full text-left prayer-card p-5 rounded-2xl flex items-center gap-4 hover:border-primary/30 border border-transparent transition-all group"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: "linear-gradient(135deg, hsl(42 80% 50% / 0.15), hsl(42 80% 50% / 0.05))",
                    }}
                  >
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-semibold text-foreground truncate">
                        {group.name}
                      </h3>
                      {group.role === "owner" && (
                        <Crown className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      )}
                    </div>
                    {group.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {group.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {group.member_count} {group.member_count === 1 ? "member" : "members"}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> Create Prayer Group
            </DialogTitle>
            <DialogDescription>
              Start a new prayer group and invite friends with a unique code.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Group Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Wednesday Night Bible Study"
                className="rounded-xl"
                maxLength={80}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Description <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="What is this group about?"
                className="rounded-xl resize-none"
                rows={3}
                maxLength={300}
              />
            </div>
            <Button
              onClick={handleCreate}
              disabled={!name.trim() || submitting}
              className="w-full btn-gold rounded-xl h-11 gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create Group
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Join Dialog */}
      <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" /> Join a Group
            </DialogTitle>
            <DialogDescription>
              Enter the invite code shared by a group member.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Paste invite code…"
              className="rounded-xl text-center tracking-widest font-mono"
              maxLength={24}
            />
            <Button
              onClick={handleJoin}
              disabled={!code.trim() || submitting}
              className="w-full btn-gold rounded-xl h-11 gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              Join Group
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
