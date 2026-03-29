import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, Send, Loader2 } from "lucide-react";
import type { CompanionEncouragement } from "@/hooks/useCompanions";

const QUICK_EMOJIS = ["🙏", "❤️", "💪", "🌟", "🕊️", "🤗", "✨", "🔥"];

interface Member {
  user_id: string;
  profile?: { full_name?: string | null } | null;
  profiles?: { full_name?: string | null } | null;
}

interface EncouragementComposerProps {
  members: Member[];
  userId: string | undefined;
  encouragements: CompanionEncouragement[];
  onSend: (toUserId: string, message: string, emoji?: string) => Promise<void>;
}

export default function EncouragementComposer({
  members,
  userId,
  encouragements,
  onSend,
}: EncouragementComposerProps) {
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState<string>("🙏");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const otherMembers = members.filter((m) => m.user_id !== userId);

  const handleSend = async () => {
    if (!selectedMember) return;
    setSending(true);
    await onSend(selectedMember, message, selectedEmoji);
    setSending(false);
    setSent(true);
    setMessage("");
    setSelectedMember(null);
    setTimeout(() => setSent(false), 3000);
  };

  const myRecentEncouragements = encouragements.filter((e) => e.to_user_id === userId).slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-5 space-y-4"
    >
      <h4 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
        <Heart className="w-4 h-4 text-primary" />
        Send Encouragement
      </h4>

      {/* Show received */}
      {myRecentEncouragements.length > 0 && (
        <div className="space-y-1.5">
          {myRecentEncouragements.map((e) => (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 text-xs p-2 rounded-xl bg-primary/5 border border-primary/10"
            >
              <span>{e.emoji || "💛"}</span>
              <span className="text-muted-foreground">{e.message || "You are being prayed for"}</span>
            </motion.div>
          ))}
        </div>
      )}

      {/* Sent confirmation */}
      <AnimatePresence>
        {sent && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center text-xs text-emerald-600 py-2"
          >
            ✨ Encouragement sent — may it bless their heart
          </motion.div>
        )}
      </AnimatePresence>

      {otherMembers.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center">No other members to encourage yet.</p>
      ) : (
        <div className="space-y-3">
          {/* Member pills */}
          <div className="flex flex-wrap gap-1.5">
            {otherMembers.map((m) => {
              const name = m.profile?.full_name || m.profiles?.full_name || "Member";
              return (
                <motion.button
                  key={m.user_id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedMember(m.user_id)}
                  className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                    selectedMember === m.user_id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {name.split(" ")[0]}
                </motion.button>
              );
            })}
          </div>

          <AnimatePresence>
            {selectedMember && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden space-y-3"
              >
                {/* Quick emojis */}
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {QUICK_EMOJIS.map((e) => (
                    <motion.button
                      key={e}
                      whileTap={{ scale: 0.85 }}
                      onClick={() => setSelectedEmoji(e)}
                      className={`text-lg p-1.5 rounded-lg transition-all ${
                        selectedEmoji === e ? "bg-primary/15 ring-1 ring-primary/30" : "hover:bg-muted/50"
                      }`}
                    >
                      {e}
                    </motion.button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="A short note of encouragement…"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="rounded-xl text-sm flex-1"
                    maxLength={160}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={sending}
                    size="icon"
                    className="rounded-xl bg-gradient-to-r from-primary to-primary/80 shrink-0"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
