import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

function PrayingHandsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C12 2 9 5.5 9 9v4l-2 3v3h10v-3l-2-3V9c0-3.5-3-7-3-7z" />
      <path d="M9 13H7.5a1.5 1.5 0 0 0 0 3H9" />
      <path d="M15 13h1.5a1.5 1.5 0 0 1 0 3H15" />
      <line x1="9" y1="19" x2="15" y2="19" />
    </svg>
  );
}

interface PrayedButtonProps {
  prayerId: string;
  userId: string | undefined;
  accentColor?: string;
  initialCount?: number;
  size?: "sm" | "md";
}

export function PrayedButton({ prayerId, userId, accentColor = "hsl(42 75% 40%)", initialCount = 0, size = "md" }: PrayedButtonProps) {
  const { toast } = useToast();
  const [prayed, setPrayed] = useState(false);
  const [prayedCount, setPrayedCount] = useState(initialCount);
  const [prayAnim, setPrayAnim] = useState(false);
  const [prayedFloat, setPrayedFloat] = useState(false);
  const cooldownRef = useRef(false);

  useEffect(() => {
    if (!userId) return;
    supabase.from("prayed_actions").select("id").eq("prayer_id", prayerId).eq("user_id", userId).maybeSingle()
      .then(({ data }) => setPrayed(!!data));
  }, [prayerId, userId]);

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) { toast({ title: "Sign in to track prayers" }); return; }
    if (cooldownRef.current) return;
    cooldownRef.current = true;
    setTimeout(() => { cooldownRef.current = false; }, 3000);
    setPrayAnim(true); setTimeout(() => setPrayAnim(false), 400);
    if (prayed) {
      await supabase.from("prayed_actions").delete().eq("prayer_id", prayerId).eq("user_id", userId);
      setPrayed(false); setPrayedCount(c => Math.max(0, c - 1));
    } else {
      await supabase.from("prayed_actions").insert({ prayer_id: prayerId, user_id: userId });
      setPrayed(true); setPrayedCount(c => c + 1);
      setPrayedFloat(true); setTimeout(() => setPrayedFloat(false), 1200);
      toast({ title: "Prayer recorded 🙏" });
    }
  };

  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-5 h-5";
  const btnClass = size === "sm"
    ? "flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-accent/60"
    : "flex items-center gap-1.5 p-2.5 rounded-xl transition-colors hover:bg-slate-100";

  return (
    <div className="relative">
      <AnimatePresence>
        {prayedFloat && (
          <motion.span
            key="prayed-float"
            initial={{ opacity: 1, y: 0, x: "-50%" }}
            animate={{ opacity: 0, y: -28 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: "easeOut" }}
            className="absolute left-1/2 bottom-full mb-1 text-xs font-semibold pointer-events-none select-none whitespace-nowrap"
            style={{ color: accentColor }}
          >
            🙏 Prayed
          </motion.span>
        )}
      </AnimatePresence>
      <motion.button
        onClick={toggle}
        animate={prayAnim ? { scale: [1, 1.35, 1] } : {}}
        transition={{ duration: 0.35 }}
        className={btnClass}
        style={{ color: prayed ? accentColor : "hsl(215 14% 60%)" }}
        title="I prayed this"
      >
        <PrayingHandsIcon className={iconSize} />
        {prayedCount > 0 && <span className="text-xs">{prayedCount}</span>}
      </motion.button>
    </div>
  );
}
