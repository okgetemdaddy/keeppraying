import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, BookOpen, Sparkles, Shield, Bird, BookMarked, Heart } from "lucide-react";

const SLIDES = [
  {
    id: "board",
    icon: BookOpen,
    title: "Prayer Board",
    headline: "Your personal sanctuary to organize and revisit prayers",
    body: "Save prayers, build playlists, track your journey. A sacred space built around your walk with God.",
    cta: "Open My Board",
    href: "/board",
    gradient: "from-[hsl(150_38%_18%)] via-[hsl(150_32%_22%)] to-[hsl(150_28%_28%)]",
    accentColor: "hsl(150 38% 56%)",
    glowColor: "hsl(150 38% 36% / 0.35)",
    badge: "✦ Organize",
  },
  {
    id: "assistant",
    icon: Sparkles,
    title: "PrayerAssist.ing",
    headline: "Your helpful companion for writing prayers and Bible questions",
    body: "Struggling to find words? PrayerAssist helps craft Spirit-led prayers, answers scripture questions, and walks alongside you.",
    cta: "Try PrayerAssist",
    href: "/assistant",
    gradient: "from-[hsl(38_65%_16%)] via-[hsl(42_70%_20%)] to-[hsl(45_60%_26%)]",
    accentColor: "hsl(42 85% 62%)",
    glowColor: "hsl(42 85% 46% / 0.35)",
    badge: "✦ AI-Powered",
  },
  {
    id: "war-room",
    icon: Shield,
    title: "KeepFight.ing — The War Room",
    headline: "Immersive prayer space with playlists, themes & ambient music",
    body: "Enter your war room. Choose a theme, queue your prayers, and pray with full focus in a beautiful, distraction-free sanctuary.",
    cta: "Enter the War Room",
    href: "/war-room",
    gradient: "from-[hsl(220_45%_14%)] via-[hsl(240_38%_18%)] to-[hsl(260_30%_22%)]",
    accentColor: "hsl(220 80% 70%)",
    glowColor: "hsl(220 70% 60% / 0.30)",
    badge: "✦ Immersive",
  },
  {
    id: "testify",
    icon: Bird,
    title: "Testify",
    headline: "Read, be encouraged, and share your own story of answered prayer",
    body: "God answers prayer. Read how He's moved in the lives of real believers — and when you're ready, share your own testimony.",
    cta: "Read Testimonies",
    href: "/testify",
    gradient: "from-[hsl(25_45%_16%)] via-[hsl(30_40%_20%)] to-[hsl(35_38%_26%)]",
    accentColor: "hsl(38 80% 65%)",
    glowColor: "hsl(38 75% 50% / 0.30)",
    badge: "✦ Community",
  },
  {
    id: "blog",
    icon: BookMarked,
    title: "KeepGrow.ing",
    headline: "Daily encouragement and growth in faith",
    body: "Devotionals, reflections, and articles crafted to strengthen your walk. Fresh content to keep your faith alive and growing.",
    cta: "Read the Blog",
    href: "/blog",
    gradient: "from-[hsl(160_38%_15%)] via-[hsl(165_33%_19%)] to-[hsl(155_28%_25%)]",
    accentColor: "hsl(155 50% 55%)",
    glowColor: "hsl(155 45% 40% / 0.30)",
    badge: "✦ Grow",
  },
  {
    id: "community",
    icon: Heart,
    title: "Spread Love",
    headline: "Like, comment, save, and share a prayer with anyone in the world",
    body: "KeepPray.ing is a living community. Encourage others by hearting their prayers, sharing them with friends, and praying together across the globe.",
    cta: "Browse Prayers",
    href: "/prayers",
    gradient: "from-[hsl(355_45%_16%)] via-[hsl(0_40%_20%)] to-[hsl(10_38%_26%)]",
    accentColor: "hsl(0 72% 68%)",
    glowColor: "hsl(0 72% 55% / 0.28)",
    badge: "✦ Together",
  },
];

export default function FeatureCarousel() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [direction, setDirection] = useState<1 | -1>(1);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const touchStartX = useRef<number | null>(null);

  const go = useCallback((next: number, dir?: 1 | -1) => {
    const d = dir ?? (next > current ? 1 : -1);
    setDirection(d);
    setCurrent((next + SLIDES.length) % SLIDES.length);
  }, [current]);

  const goNext = useCallback(() => go(current + 1, 1), [go, current]);
  const goPrev = useCallback(() => go(current - 1, -1), [go, current]);

  useEffect(() => {
    if (paused) return;
    timerRef.current = setInterval(goNext, 5500);
    return () => clearInterval(timerRef.current);
  }, [paused, goNext]);

  const slide = SLIDES[current];

  const variants = {
    enter: (d: number) => ({ opacity: 0, x: d * 40, scale: 0.98 }),
    center: { opacity: 1, x: 0, scale: 1 },
    exit: (d: number) => ({ opacity: 0, x: d * -40, scale: 0.98 }),
  };

  return (
    <section
      className="relative overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
      onTouchEnd={e => {
        if (touchStartX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        if (Math.abs(dx) > 44) dx < 0 ? goNext() : goPrev();
        touchStartX.current = null;
      }}
    >
      {/* Intro tagline */}
      <div className="relative z-10 pt-16 pb-0 text-center px-4">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65 }}
          className="text-xs uppercase tracking-widest text-muted-foreground mb-3"
        >
          Built for believers
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.05 }}
          className="font-display text-3xl sm:text-4xl font-bold mb-2"
        >
          Everything your prayer life needs
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.18 }}
          className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto leading-relaxed"
        >
          The adversities every Christian shares are battles to keep reading the Word and to keep praying.
          Here, we aim to make both the fabric of your day.
        </motion.p>
      </div>




    </section>
  );
}
