import { useState } from "react";
import SacredSpinner from "@/components/SacredSpinner";
import VerseLink from "@/components/VerseLink";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useFamilyRooms } from "@/hooks/useFamilyRooms";
import { useBackLink } from "@/hooks/useBackLink";
import { SiteNav } from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Home, Plus, Loader2, Crown, ChevronRight, Baby,
} from "lucide-react";

export default function FamilyRooms() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { rooms, loading, createRoom } = useFamilyRooms();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const backLink = useBackLink();

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [childFriendly, setChildFriendly] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!user) { navigate("/auth", { replace: true }); return null; }

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    const room = await createRoom(name.trim(), desc.trim(), childFriendly);
    setSubmitting(false);
    if (room) {
      toast({ title: `"${name}" created! 🏠`, description: "Use the Invite button to share a magic link with your family." });
      setCreateOpen(false);
      setName(""); setDesc(""); setChildFriendly(false);
      navigate(`/family/${room.id}`);
    } else {
      toast({ title: "Failed to create room", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8 space-y-3">
          <div className="w-14 h-14 rounded-full bg-gradient-gold flex items-center justify-center mx-auto shadow-gold">
            <Home className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">Family Prayer Rooms</h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            A private, sacred space for your family to pray together across generations. Invite parents, children, and grandparents to share prayers in one safe room.
          </p>
        </motion.div>

        {/* Actions */}
        <div className={`flex gap-3 mb-8 ${isMobile ? "flex-col" : "justify-center"}`}>
          <Button onClick={() => setCreateOpen(true)} className="btn-gold rounded-xl gap-2 h-11">
            <Plus className="w-4 h-4" /> Create Family Room
          </Button>
        </div>

        {/* Rooms list */}
        {loading ? (
          <SacredSpinner />
        ) : rooms.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 space-y-4">
            <p className="text-muted-foreground text-sm">No family rooms yet. Create one and invite your family!</p>
            <p className="verse-text text-xs">"Train up a child in the way he should go…" — <VerseLink reference="Proverbs 22:6" /></p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {rooms.map((room, i) => (
                <motion.button
                  key={room.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => navigate(`/family/${room.id}`)}
                  className="w-full text-left prayer-card p-5 rounded-2xl flex items-center gap-4 hover:border-primary/30 border border-transparent transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, hsl(42 80% 50% / 0.15), hsl(42 80% 50% / 0.05))" }}>
                    <Home className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-semibold text-foreground truncate">{room.name}</h3>
                      {room.role === "owner" && <Crown className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                      {room.child_friendly && <Baby className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" />}
                    </div>
                    {room.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{room.description}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{room.member_count} {room.member_count === 1 ? "member" : "members"}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        )}

        {backLink && (
          <div className="text-center pt-10">
            <Link to={backLink.to} className="text-xs text-muted-foreground hover:text-primary transition-colors">
              ← {backLink.label}
            </Link>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2"><Home className="w-5 h-5 text-primary" /> Create Family Room</DialogTitle>
            <DialogDescription>A private prayer sanctuary for your family.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Room Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. The Johnson Family" className="rounded-xl" maxLength={80} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
              <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="A few words about your family room…" className="rounded-xl resize-none" rows={2} maxLength={300} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
              <div className="flex items-center gap-2">
                <Baby className="w-4 h-4 text-pink-400" />
                <div>
                  <p className="text-sm font-medium text-foreground">Child-Friendly Mode</p>
                  <p className="text-xs text-muted-foreground">Gentle language and age-appropriate content</p>
                </div>
              </div>
              <Switch checked={childFriendly} onCheckedChange={setChildFriendly} />
            </div>
            <Button onClick={handleCreate} disabled={!name.trim() || submitting} className="w-full btn-gold rounded-xl h-11 gap-2">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create Family Room
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
