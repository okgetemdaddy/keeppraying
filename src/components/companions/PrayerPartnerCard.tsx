import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { HandHeart, UserPlus, Check, X, Loader2, Search, Flame, ChevronRight, Trash2 } from "lucide-react";
import { ResponsiveDialog as Dialog, ResponsiveDialogContent as DialogContent, ResponsiveDialogHeader as DialogHeader, ResponsiveDialogTitle as DialogTitle, ResponsiveDialogDescription as DialogDescription } from "@/components/ui/responsive-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePrayerPartners } from "@/hooks/useCompanions";
import { useCompanions } from "@/hooks/useCompanions";
import CheckInCard from "./CheckInCard";
import GoalProgress from "./GoalProgress";
import EncouragementComposer from "./EncouragementComposer";
import { useToast } from "@/hooks/use-toast";

export default function PrayerPartnerCard() {
  const { user } = useAuth();
  const { partners, pending, loading, sendRequest, acceptRequest, declineRequest, removePartner } = usePrayerPartners();
  const { toast } = useToast();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [activePartner, setActivePartner] = useState<string | null>(null);

  const pendingForMe = pending.filter((p) => p.user2_id === user?.id && p.status === "pending");
  const pendingFromMe = pending.filter((p) => p.user1_id === user?.id && p.status === "pending");

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, current_streak")
      .ilike("full_name", `%${searchQuery}%`)
      .neq("id", user?.id || "")
      .limit(10);
    setSearchResults(data || []);
    setSearching(false);
  };

  const handleSendRequest = async (toId: string) => {
    setSendingTo(toId);
    const error = await sendRequest(toId);
    if (error) {
      toast({ title: "Already sent", description: "A request already exists for this person.", variant: "destructive" });
    } else {
      toast({ title: "Request sent 🕊️", description: "Your prayer partner invitation has been sent." });
    }
    setSendingTo(null);
  };

  // Active partner companion view
  const activePartnerData = partners.find((p) => p.id === activePartner);

  if (activePartner && activePartnerData) {
    return (
      <PartnerDetailView
        partner={activePartnerData}
        userId={user?.id}
        onBack={() => setActivePartner(null)}
        onRemove={async () => { await removePartner(activePartner); setActivePartner(null); }}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-semibold text-foreground flex items-center gap-2">
          <HandHeart className="w-5 h-5 text-primary" />
          Prayer Partners
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSearchOpen(true)}
          className="rounded-xl text-xs gap-1.5"
        >
          <UserPlus className="w-3.5 h-3.5" /> Find Partner
        </Button>
      </div>

      {/* Pending requests for me */}
      <AnimatePresence>
        {pendingForMe.map((req) => (
          <motion.div
            key={req.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-4 space-y-3"
          >
            <p className="text-sm font-medium text-foreground">
              <span className="font-semibold">{req.partnerProfile?.full_name || "Someone"}</span>{" "}
              wants to walk with you in prayer
            </p>
            <p className="text-xs text-muted-foreground">
              Becoming prayer partners means committing to pray for one another regularly — a sacred bond.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => acceptRequest(req.id)} className="rounded-xl text-xs gap-1 bg-gradient-to-r from-primary to-primary/80 flex-1">
                <Check className="w-3.5 h-3.5" /> Accept
              </Button>
              <Button onClick={() => declineRequest(req.id)} variant="outline" className="rounded-xl text-xs gap-1">
                <X className="w-3.5 h-3.5" /> Decline
              </Button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Accepted partners */}
      {partners.length === 0 && pendingForMe.length === 0 && pendingFromMe.length === 0 ? (
        <div className="text-center py-8 space-y-2">
          <p className="text-3xl">🤝</p>
          <p className="text-sm text-muted-foreground">
            "Two are better than one... if either of them falls down, one can help the other up."
          </p>
          <p className="text-xs text-muted-foreground italic">— Ecclesiastes 4:9-10</p>
        </div>
      ) : (
        <div className="space-y-2">
          {partners.map((p) => (
            <motion.button
              key={p.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActivePartner(p.id)}
              className="w-full flex items-center gap-3 p-3 rounded-2xl border border-border/50 bg-card/60 hover:bg-card transition-colors text-left"
            >
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                  {p.partnerProfile?.full_name?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {p.partnerProfile?.full_name || "Prayer Partner"}
                </p>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Flame className="w-2.5 h-2.5" style={{ color: "hsl(25 90% 55%)" }} />
                  {p.partnerProfile?.current_streak || 0} day streak
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </motion.button>
          ))}
          {pendingFromMe.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-3 rounded-2xl border border-border/30 bg-muted/20 opacity-60">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                  {p.partnerProfile?.full_name?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground truncate">{p.partnerProfile?.full_name || "Invited"}</p>
                <p className="text-[10px] text-muted-foreground">Awaiting response…</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search dialog */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" /> Find a Prayer Partner
            </DialogTitle>
            <DialogDescription>Search by name to invite someone to walk with you in prayer.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input
              placeholder="Search by name…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="rounded-xl text-sm"
            />
            <Button onClick={handleSearch} disabled={searching} size="icon" className="rounded-xl shrink-0">
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>
          <div className="space-y-2 max-h-[40vh] overflow-y-auto">
            {searchResults.map((profile) => (
              <div key={profile.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                    {profile.full_name?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{profile.full_name || "User"}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleSendRequest(profile.id)}
                  disabled={sendingTo === profile.id}
                  className="rounded-xl text-xs h-7"
                >
                  {sendingTo === profile.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Invite"}
                </Button>
              </div>
            ))}
            {searchResults.length === 0 && searchQuery && !searching && (
              <p className="text-xs text-muted-foreground text-center py-4">No users found. Try a different name.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

/* ── Partner detail view ────────────────────── */
function PartnerDetailView({
  partner,
  userId,
  onBack,
  onRemove,
}: {
  partner: any;
  userId: string | undefined;
  onBack: () => void;
  onRemove: () => void;
}) {
  const { hasCheckedIn, myCheckin, moodCounts, sharedMessages, goals, encouragements, submitCheckin, createGoal, incrementGoal, sendEncouragement } =
    useCompanions("partner", partner.id);

  const partnerMember = {
    user_id: partner.partnerProfile?.id || (partner.user1_id === userId ? partner.user2_id : partner.user1_id),
    profile: partner.partnerProfile,
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="rounded-xl text-xs">
          ← Back
        </Button>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-base font-semibold text-foreground truncate">
            🤝 {partner.partnerProfile?.full_name || "Prayer Partner"}
          </h3>
          <p className="text-[10px] text-muted-foreground">Your sacred partnership in prayer</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onRemove} className="text-destructive/60 hover:text-destructive h-8 w-8">
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      <CheckInCard hasCheckedIn={hasCheckedIn} myCheckin={myCheckin} onSubmit={submitCheckin} />
      <GoalProgress goals={goals} userId={userId} onCreateGoal={createGoal} onIncrementGoal={incrementGoal} />
      <EncouragementComposer
        members={[partnerMember]}
        userId={userId}
        encouragements={encouragements}
        onSend={sendEncouragement}
      />
    </motion.div>
  );
}
