import { Link } from "react-router-dom";
import VerseLink from "@/components/VerseLink";
import { motion } from "framer-motion";
import { Heart, Users, BookOpen, Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const BENEFITS = [
  {
    icon: <Heart className="w-5 h-5" />,
    title: "Lift each other up",
    description: "When you pray for someone, they feel it. Real prayers, real people, real God.",
  },
  {
    icon: <Users className="w-5 h-5" />,
    title: "Build a praying community",
    description: "Invite your church, small group, or family to pray together — even when apart.",
  },
  {
    icon: <BookOpen className="w-5 h-5" />,
    title: "Grow in Scripture",
    description: "Every prayer is enriched with relevant Bible verses. Grow deeper as you pray.",
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: "Private & secure",
    description: "Your prayers are protected. Share only what you choose, with whom you choose.",
  },
  {
    icon: <Sparkles className="w-5 h-5" />,
    title: "AI-guided prayer life",
    description: "PrayerAssist helps you learn to pray — without writing prayers for you.",
  },
];

interface GrowthCTAProps {
  totalPrayers: number;
}

export default function GrowthCTA({ totalPrayers }: GrowthCTAProps) {
  return (
    <div className="space-y-8">
      {/* Hero encouragement */}
      <div className="text-center rounded-3xl border border-white/10 p-8 sm:p-10" style={{ background: "linear-gradient(160deg, hsla(42, 40%, 12%, 0.4) 0%, hsla(220, 50%, 6%, 0.6) 100%)" }}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
        >
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "hsla(42, 78%, 54%, 0.15)" }}>
            <Users className="w-8 h-8" style={{ color: "hsl(42, 78%, 60%)" }} />
          </div>
        </motion.div>

        <h2 className="font-display text-2xl sm:text-3xl font-bold mb-3" style={{ color: "hsl(42, 78%, 60%)" }}>
          Nobody nearby yet?
        </h2>
        <p className="text-white/60 text-sm sm:text-base leading-relaxed max-w-lg mx-auto mb-4">
          Encourage your church and everyone you know to join. Start by letting someone know
          you are praying for them. The more people who join, the stronger our prayer
          covering becomes — over your neighborhood, your city, and beyond.
        </p>

        {totalPrayers > 0 && (
          <p className="text-white/40 text-sm mb-6">
            Join <strong className="text-white/70">{totalPrayers.toLocaleString()}</strong> prayers already lifted on KeepPray.ing
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/prayers">
            <Button className="btn-gold rounded-xl gap-2 px-6">
              <Heart className="w-4 h-4" /> Create a Prayer
            </Button>
          </Link>
          <Link to="/assistant">
            <Button variant="outline" className="rounded-xl gap-2 px-6 border-white/15 text-white/70 hover:text-white hover:bg-white/10">
              <Sparkles className="w-4 h-4" /> Ask PrayerAssist
            </Button>
          </Link>
        </div>
      </div>

      {/* Benefits grid */}
      <div>
        <h3 className="font-display text-lg font-semibold text-white/70 mb-4 text-center">
          Why join KeepPray.ing?
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {BENEFITS.map((b, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-2xl border border-white/[0.08] p-5 hover:border-white/15 transition-all"
              style={{ background: "hsla(220, 50%, 8%, 0.5)" }}
            >
              <div className="mb-3" style={{ color: "hsl(42, 78%, 60%)" }}>
                {b.icon}
              </div>
              <h4 className="text-sm font-semibold text-white/80 mb-1">{b.title}</h4>
              <p className="text-xs text-white/40 leading-relaxed">{b.description}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Call to action */}
      <div className="text-center py-4">
        <p className="text-white/40 text-sm italic font-display mb-3">
          "For where two or three gather in my name, there am I with them."
        </p>
        <p className="text-xs">— <VerseLink reference="Matthew 18:20" className="[&_.verse-text]:text-white/40 [&>span]:bg-white/10 [&>span]:border-white/15" /></p>
      </div>
    </div>
  );
}
