import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Wind, ArrowRight } from "lucide-react";
import { useDailyBreath } from "@/hooks/useBreathPrayers";
import { useAuth } from "@/contexts/AuthContext";
import BreathPrayerCard from "./BreathPrayerCard";

/**
 * Daily Breath Prayer section for the homepage.
 * Shows today's breath prayer with a gentle breathing animation.
 */
export default function DailyBreathSection() {
  const { prayer, loading } = useDailyBreath();
  const { user } = useAuth();

  if (loading || !prayer) return null;

  return (
    <section className="py-16 sm:py-20 bg-gradient-divine relative overflow-hidden">
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: "radial-gradient(ellipse at 50% 40%, hsl(42 85% 46% / 0.12) 0%, transparent 60%)",
      }} />
      <div className="container mx-auto px-4 max-w-lg relative">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center space-y-5"
        >
          <div className="flex items-center justify-center gap-2 text-xs font-medium uppercase tracking-widest" style={{ color: "hsl(42 75% 46%)" }}>
            <Wind className="w-3.5 h-3.5" />
            Today's Breath Prayer
          </div>

          <BreathPrayerCard
            id={prayer.id}
            prayer_text={prayer.prayer_text}
            labels={prayer.labels}
            extended_prayer={prayer.extended_prayer}
            meditation_link={prayer.meditation_link}
            likes_count={prayer.likes_count}
            prayed_count={prayer.prayed_count}
            userId={user?.id || null}
            compact
          />

          <Link
            to="/breathe"
            className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-primary"
            style={{ color: "hsl(42 75% 40%)" }}
          >
            Explore more breath prayers <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
