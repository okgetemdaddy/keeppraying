import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Send, AlertTriangle, Heart } from "lucide-react";
import { Link } from "react-router-dom";

interface UrgentPrayer {
  id: string;
  title: string | null;
  prayer_text: string;
  created_by: string | null;
}

/**
 * Floating notification panel that shows urgent prayer requests
 * to users who are on standby. Includes a quick-reply composer.
 */
export function UrgentPrayerNotifier() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOnStandby, setIsOnStandby] = useState(false);
  const [urgentPrayer, setUrgentPrayer] = useState<UrgentPrayer | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Check if user is on standby
  useEffect(() => {
    if (!user) return;
    supabase
      .from("prayer_standby")
      .select("is_active")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setIsOnStandby(data?.is_active ?? false));

    const channel = supabase
      .channel("my-standby-status")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "prayer_standby", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as { is_active?: boolean } | undefined;
          setIsOnStandby(row?.is_active ?? false);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Listen for new urgent prayers (label contains "urgent")
  useEffect(() => {
    if (!isOnStandby || !user) return;

    const channel = supabase
      .channel("urgent-prayers")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "prayer_cards" },
        (payload) => {
          const card = payload.new as UrgentPrayer & { labels?: string[]; status: string };
          // Only show if it has "urgent" label and is approved
          if (
            card.labels?.includes("urgent") &&
            ["approved", "ai_generated"].includes(card.status) &&
            card.created_by !== user.id &&
            !dismissed.has(card.id)
          ) {
            setUrgentPrayer(card);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isOnStandby, user, dismissed]);

  const dismiss = () => {
    if (urgentPrayer) {
      setDismissed(prev => new Set(prev).add(urgentPrayer.id));
    }
    setUrgentPrayer(null);
    setReplyText("");
  };

  const sendReply = async () => {
    if (!urgentPrayer || !replyText.trim() || !user) return;
    setSending(true);
    try {
      await supabase.from("standby_responses").insert({
        prayer_id: urgentPrayer.id,
        responder_id: user.id,
        message: replyText.trim(),
      });
      toast({ title: "🙏 Prayer response sent!", description: "The requester will see your encouragement." });
      dismiss();
    } catch {
      toast({ title: "Could not send response", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  if (!urgentPrayer) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 100, scale: 0.9 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="fixed bottom-6 right-6 z-[100] w-[340px] max-w-[calc(100vw-2rem)] rounded-2xl border shadow-2xl overflow-hidden"
        style={{
          background: "hsl(0 0% 100%)",
          borderColor: "hsl(42 60% 80%)",
          boxShadow: "0 20px 60px -15px hsl(42 60% 30% / 0.25), 0 8px 20px -6px rgba(0,0,0,0.1)",
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3"
          style={{ background: "linear-gradient(135deg, hsl(42 85% 94%), hsl(38 70% 92%))" }}>
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <AlertTriangle className="w-4 h-4" style={{ color: "hsl(42 85% 42%)" }} />
          </motion.div>
          <span className="text-sm font-semibold flex-1" style={{ color: "hsl(25 35% 18%)" }}>
            Urgent Prayer Request
          </span>
          <button onClick={dismiss} className="p-1 rounded-lg hover:bg-black/5 transition-colors">
            <X className="w-4 h-4" style={{ color: "hsl(25 18% 50%)" }} />
          </button>
        </div>

        {/* Prayer content */}
        <div className="px-4 py-3 space-y-2">
          {urgentPrayer.title && (
            <h4 className="font-display font-semibold text-sm" style={{ color: "hsl(25 35% 14%)" }}>
              {urgentPrayer.title}
            </h4>
          )}
          <p className="text-sm leading-relaxed line-clamp-4" style={{ color: "hsl(25 28% 32%)" }}>
            {urgentPrayer.prayer_text}
          </p>
          <Link
            to={`/prayer/${urgentPrayer.id}`}
            className="text-xs font-medium inline-block"
            style={{ color: "hsl(42 75% 40%)" }}
          >
            View full prayer →
          </Link>
        </div>

        {/* Quick reply composer */}
        <div className="px-4 pb-4 space-y-2">
          <Textarea
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            placeholder="Write a quick prayer or encouragement…"
            className="resize-none rounded-xl min-h-[60px] text-sm"
            rows={2}
          />
          <div className="flex gap-2">
            <Button
              onClick={sendReply}
              disabled={sending || !replyText.trim()}
              className="flex-1 rounded-xl gap-1.5 text-xs"
              style={{
                background: "linear-gradient(135deg, hsl(42 85% 46%), hsl(35 82% 50%))",
                color: "white",
              }}
            >
              <Send className="w-3.5 h-3.5" />
              Send Prayer
            </Button>
            <Button
              onClick={() => {
                // Quick "praying for you" response
                setReplyText("🙏 Praying for you right now. God hears your prayer.");
              }}
              variant="outline"
              className="rounded-xl gap-1.5 text-xs"
            >
              <Heart className="w-3.5 h-3.5" />
              Quick
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
