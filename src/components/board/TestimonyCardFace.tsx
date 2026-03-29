import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Share2 } from "lucide-react";

interface Verse {
  ref: string;
  text: string;
}

interface TestimonyCardFaceProps {
  testimony: {
    id: string;
    title: string | null;
    body: string;
    verses: Verse[];
    praise_count: number;
    created_at: string;
    user_id: string;
  };
  onFlipBack: () => void;
  accentColor?: string;
  textColor?: string;
  cardBg?: string;
}

export function TestimonyCardFace({
  testimony,
  onFlipBack,
  accentColor = "hsl(42 75% 40%)",
  textColor = "hsl(25 35% 14%)",
  cardBg = "hsl(var(--card))",
}: TestimonyCardFaceProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [praiseCount, setPraiseCount] = useState(testimony.praise_count || 0);
  const [userPraised, setUserPraised] = useState(false);
  const [praiseAnimating, setPraiseAnimating] = useState(false);

  const togglePraise = async () => {
    if (!user) {
      toast({ title: "Sign in to praise 🙏" });
      return;
    }
    setPraiseAnimating(true);
    setTimeout(() => setPraiseAnimating(false), 400);

    if (userPraised) {
      setUserPraised(false);
      setPraiseCount(c => Math.max(0, c - 1));
      await supabase.from("testimony_praises").delete().eq("testimony_id", testimony.id).eq("user_id", user.id);
    } else {
      setUserPraised(true);
      setPraiseCount(c => c + 1);
      await supabase.from("testimony_praises").insert({ testimony_id: testimony.id, user_id: user.id } as any);
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/testimony/${testimony.id}`;
    navigator.clipboard.writeText(url).then(() => toast({ title: "Testimony link copied! 🔗" }));
  };

  const subtleText = `${textColor}70`;
  const verses: Verse[] = Array.isArray(testimony.verses) ? testimony.verses : [];

  return (
    <div
      className="relative flex flex-col h-full overflow-y-auto overscroll-contain p-4"
      style={{ background: cardBg, color: textColor }}
    >
      {/* Glass sheen */}
      <div
        className="absolute inset-0 pointer-events-none rounded-2xl"
        style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.04) 50%, transparent 100%)" }}
      />

      {/* Decorative quote */}
      <div
        className="absolute top-2 right-4 font-display font-bold leading-none select-none pointer-events-none"
        style={{ fontSize: "5rem", lineHeight: 1, color: `${accentColor}15` }}
        aria-hidden
      >
        🙌
      </div>

      <div className="relative flex flex-col gap-3 flex-1">
        {/* Title */}
        {testimony.title && (
          <h3 className="font-display font-semibold text-sm leading-snug" style={{ color: accentColor }}>
            {testimony.title}
          </h3>
        )}

        {/* Body */}
        <FormattedText
          text={testimony.body}
          truncateAt={300}
          className="text-sm leading-relaxed flex-1"
          style={{ color: `${textColor}dd` }}
        />

        {/* Verses */}
        {verses.length > 0 && (
          <div className="space-y-1.5">
            {verses.slice(0, 2).map(v => (
              <div key={v.ref} className="flex items-start gap-1.5">
                <BookOpen className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: accentColor }} />
                <p className="text-[10px] font-display italic leading-snug" style={{ color: subtleText }}>
                  <span className="font-semibold not-italic" style={{ color: accentColor }}>{v.ref}</span>{" "}
                  — {v.text.slice(0, 80)}{v.text.length > 80 ? "…" : ""}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Actions row */}
        <div className="flex items-center gap-1 pt-2 border-t" style={{ borderColor: `${textColor}12` }}>
          {/* Praise hands */}
          <motion.button
            onClick={togglePraise}
            animate={praiseAnimating ? { scale: [1, 1.35, 1] } : {}}
            transition={{ duration: 0.35, type: "spring" }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs transition-all hover:bg-accent/40 active:scale-95"
            style={{ color: userPraised ? accentColor : subtleText }}
          >
            <span className="text-base">🙌</span>
            <span className="font-medium">{praiseCount > 0 ? praiseCount : ""}</span>
          </motion.button>

          <button
            onClick={handleShare}
            className="flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs transition-all hover:bg-accent/40"
            style={{ color: subtleText }}
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>

          <div className="flex-1" />

          {/* See Prayer */}
          <button
            onClick={onFlipBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all hover:brightness-95 active:scale-95"
            style={{ background: `${accentColor}15`, color: accentColor }}
          >
            🙏 See Prayer
          </button>
        </div>
      </div>
    </div>
  );
}
