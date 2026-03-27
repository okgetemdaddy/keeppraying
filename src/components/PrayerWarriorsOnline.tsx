import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import { useStandby } from "@/hooks/useStandby";

interface PrayerWarriorsOnlineProps {
  className?: string;
}

export function PrayerWarriorsOnline({ className = "" }: PrayerWarriorsOnlineProps) {
  const { onlineCount } = useStandby();

  if (onlineCount === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium ${className}`}
      style={{
        background: "hsl(150 40% 92%)",
        color: "hsl(150 45% 28%)",
        border: "1px solid hsl(150 38% 80%)",
      }}
    >
      {/* Pulsing green dot */}
      <span className="relative flex h-2 w-2">
        <motion.span
          className="absolute inline-flex h-full w-full rounded-full"
          style={{ background: "hsl(150 55% 50%)" }}
          animate={{ scale: [1, 1.8, 1], opacity: [0.7, 0, 0.7] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <span className="relative inline-flex rounded-full h-2 w-2"
          style={{ background: "hsl(150 55% 45%)" }} />
      </span>

      <Shield className="w-3 h-3" />
      <span>
        <strong>{onlineCount}</strong> Prayer Warrior{onlineCount !== 1 ? "s" : ""} Online
      </span>
    </motion.div>
  );
}
