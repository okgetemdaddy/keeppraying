import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Heart, Bookmark } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import VerseLink from "@/components/VerseLink";

interface BreathPrayerCardProps {
  id: string;
  prayer_text: string;
  labels?: string[] | null;
  extended_prayer?: string | null;
  meditation_link?: string | null;
  likes_count: number;
  prayed_count: number;
  userId: string | null;
  compact?: boolean;
}

/** Animated thought-bubble dots — "meditate…?" link */
function ThoughtBubbleLink({ prayerId, meditationLink }: { prayerId: string; meditationLink?: string | null }) {
  const href = meditationLink || `/prayer/${prayerId}`;
  return (
    <Link
      to={href}
      className="absolute bottom-3 right-3 flex items-end gap-[3px] group"
      title="meditate…?"
      aria-label="meditate…?"
    >
      {[4, 6, 9].map((size, i) => (
        <motion.span
          key={i}
          className="rounded-full"
          style={{
            width: size,
            height: size,
            background: "hsl(42 75% 46% / 0.45)",
          }}
          animate={{
            scale: [1, 1.25, 1],
            opacity: [0.45, 0.85, 0.45],
          }}
          transition={{
            repeat: Infinity,
            duration: 2.8,
            delay: i * 0.35,
            ease: "easeInOut",
          }}
        />
      ))}
    </Link>
  );
}

/** The breathing / pulsing animation for the card itself */
const breatheAnimation = {
  boxShadow: [
    "0 0 20px 0px hsl(42 85% 46% / 0.08), 0 4px 24px -4px hsl(42 85% 46% / 0.06)",
    "0 0 32px 4px hsl(42 85% 46% / 0.16), 0 8px 40px -4px hsl(42 85% 46% / 0.12)",
    "0 0 20px 0px hsl(42 85% 46% / 0.08), 0 4px 24px -4px hsl(42 85% 46% / 0.06)",
  ],
  scale: [1, 1.008, 1],
};
const breatheTransition = {
  repeat: Infinity as const,
  duration: 5,
  ease: "easeInOut" as const,
};

export default function BreathPrayerCard({
  id,
  prayer_text,
  labels,
  extended_prayer,
  meditation_link,
  likes_count,
  prayed_count,
  userId,
  compact = false,
}: BreathPrayerCardProps) {
  const { toast } = useToast();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likesLocal, setLikesLocal] = useState(likes_count);

  const toggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) { toast({ title: "Sign in to like" }); return; }
    if (liked) {
      await supabase.from("likes").delete().eq("prayer_id", id).eq("user_id", userId);
      setLiked(false);
      setLikesLocal(c => Math.max(0, c - 1));
    } else {
      await supabase.from("likes").insert({ prayer_id: id, user_id: userId });
      setLiked(true);
      setLikesLocal(c => c + 1);
    }
  };

  const toggleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) { toast({ title: "Sign in to save" }); return; }
    if (saved) {
      await supabase.from("user_saved_prayers").delete().eq("prayer_id", id).eq("user_id", userId);
      setSaved(false);
    } else {
      await supabase.from("user_saved_prayers").insert({ prayer_id: id, user_id: userId });
      setSaved(true);
      toast({ title: "Saved to your board 📌" });
    }
  };

  return (
    <motion.div
      animate={breatheAnimation}
      transition={breatheTransition}
      className="relative overflow-hidden"
      style={{
        borderRadius: "2rem",
        background: "linear-gradient(135deg, hsl(42 55% 98%) 0%, hsl(38 45% 96%) 50%, hsl(42 50% 97%) 100%)",
        border: "1px solid hsl(42 40% 90%)",
        padding: compact ? "1.25rem 1.5rem" : "2rem 2rem",
        minHeight: compact ? 100 : 140,
      }}
    >
      {/* 2.5D lighting highlight */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 30% 20%, hsl(42 85% 80% / 0.18) 0%, transparent 60%)",
          borderRadius: "2rem",
        }}
      />

      {/* Inner glow ring */}
      <div
        className="absolute inset-[1px] pointer-events-none"
        style={{
          borderRadius: "calc(2rem - 1px)",
          boxShadow: "inset 0 1px 2px hsl(42 80% 92% / 0.6), inset 0 -1px 1px hsl(38 22% 85% / 0.3)",
        }}
      />

      {/* Prayer text — centered, gentle */}
      <p
        className="relative font-display italic text-center leading-relaxed"
        style={{
          color: "hsl(25 30% 22%)",
          fontSize: compact ? "0.95rem" : "1.1rem",
          lineHeight: 1.8,
        }}
      >
        {prayer_text}
      </p>

      {/* Labels — rendered subtly below */}
      {labels && labels.length > 0 && !compact && (
        <div className="relative flex flex-wrap justify-center gap-1.5 mt-4">
          {labels.slice(0, 3).map(label => (
            <span
              key={label}
              className="text-[10px] px-2.5 py-0.5 rounded-full font-medium"
              style={{
                background: "hsl(42 60% 94%)",
                color: "hsl(38 65% 38%)",
                border: "1px solid hsl(42 50% 88%)",
              }}
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Scripture snippet */}
      {extended_prayer && !compact && (
        <p className="relative text-center text-xs italic mt-3" style={{ color: "hsl(25 18% 52%)" }}>
          {extended_prayer.length > 100 ? extended_prayer.slice(0, 100) + "…" : extended_prayer}
        </p>
      )}

      {/* Bottom actions */}
      {!compact && (
        <div className="relative flex items-center justify-center gap-4 mt-4">
          <button
            onClick={toggleLike}
            className="flex items-center gap-1 text-xs transition-colors"
            style={{ color: liked ? "hsl(0 72% 51%)" : "hsl(25 18% 56%)" }}
          >
            <Heart className={`w-3.5 h-3.5 ${liked ? "fill-current" : ""}`} />
            {likesLocal > 0 && <span>{likesLocal}</span>}
          </button>
          <button
            onClick={toggleSave}
            className="flex items-center gap-1 text-xs transition-colors"
            style={{ color: saved ? "hsl(42 75% 40%)" : "hsl(25 18% 56%)" }}
          >
            <Bookmark className={`w-3.5 h-3.5 ${saved ? "fill-current" : ""}`} />
          </button>
        </div>
      )}

      {/* Thought bubble dots link */}
      <ThoughtBubbleLink prayerId={id} meditationLink={meditation_link} />
    </motion.div>
  );
}
