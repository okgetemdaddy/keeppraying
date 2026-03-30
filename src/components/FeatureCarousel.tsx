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

      {/* Carousel */}
      <div className="relative mx-auto max-w-5xl px-4 py-10">
        <div className="relative rounded-3xl overflow-hidden" style={{ minHeight: 380 }}>
          {/* Background gradient layer */}
          <AnimatePresence custom={direction} mode="sync">
            <motion.div
              key={`bg-${current}`}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className={`absolute inset-0 bg-gradient-to-br ${slide.gradient}`}
            />
          </AnimatePresence>

          {/* Glow orb */}
          <div
            className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none transition-all duration-700"
            style={{ background: slide.glowColor, transform: "translate(30%, -30%)" }}
          />
          <div
            className="absolute bottom-0 left-0 w-64 h-64 rounded-full blur-3xl pointer-events-none transition-all duration-700"
            style={{ background: slide.glowColor, transform: "translate(-30%, 30%)", opacity: 0.5 }}
          />

          {/* Glass sheen */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 50%, rgba(255,255,255,0.02) 100%)" }} />

          {/* Content */}
          <AnimatePresence custom={direction} mode="wait">
            <motion.div
              key={current}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 flex flex-col sm:flex-row items-center gap-8 sm:gap-12 p-8 sm:p-12"
            >
              {/* Icon column */}
              <div className="flex-shrink-0 flex flex-col items-center gap-4">
                <motion.div
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.4, type: "spring", stiffness: 220 }}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl flex items-center justify-center relative"
                  style={{
                    background: `${slide.accentColor}22`,
                    border: `1.5px solid ${slide.accentColor}44`,
                    boxShadow: `0 8px 32px -8px ${slide.glowColor}, inset 0 1px 0 rgba(255,255,255,0.1)`,
                  }}
                >
                  <slide.icon className="w-10 h-10 sm:w-12 sm:h-12" style={{ color: slide.accentColor }} />
                </motion.div>
                <span
                  className="text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full"
                  style={{ background: `${slide.accentColor}22`, color: slide.accentColor, border: `1px solid ${slide.accentColor}33` }}
                >
                  {slide.badge}
                </span>
              </div>

              {/* Text column */}
              <div className="flex-1 text-center sm:text-left space-y-4">
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 }}
                  className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: `${slide.accentColor}cc` }}
                >
                  {slide.title}
                </motion.p>
                <motion.h3
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.14 }}
                  className="font-display text-2xl sm:text-3xl font-bold leading-snug text-white"
                >
                  {slide.headline}
                </motion.h3>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-sm sm:text-base leading-relaxed"
                  style={{ color: "rgba(255,255,255,0.72)" }}
                >
                  {slide.body}
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.26 }}
                >
                  <Link to={slide.href}>
                    <Button
                      size="lg"
                      className="rounded-2xl h-11 px-7 gap-2 text-sm font-semibold transition-all hover:scale-105"
                      style={{
                        background: slide.accentColor,
                        color: "hsl(25 35% 10%)",
                        boxShadow: `0 6px 24px -6px ${slide.glowColor}`,
                      }}
                    >
                      Explore {slide.title.split(" ")[0]} <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Nav arrows */}
          <button
            onClick={goPrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
            style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.8)" }}
            aria-label="Previous slide"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
            style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.8)" }}
            aria-label="Next slide"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Dot indicators */}
        <div className="flex items-center justify-center gap-2 mt-5">
          {SLIDES.map((s, i) => (
            <button
              key={s.id}
              onClick={() => go(i, i > current ? 1 : -1)}
              className="rounded-full transition-all duration-300 focus:outline-none"
              style={{
                width: i === current ? 24 : 8,
                height: 8,
                background: i === current ? "hsl(42 85% 46%)" : "hsl(42 30% 70% / 0.4)",
              }}
              aria-label={`Go to slide ${i + 1}: ${s.title}`}
            />
          ))}
        </div>

        {/* Autoplay progress bar */}
        {!paused && (
          <div className="mt-3 mx-auto max-w-xs h-0.5 rounded-full overflow-hidden" style={{ background: "hsl(42 30% 80% / 0.25)" }}>
            <motion.div
              key={current}
              className="h-full rounded-full"
              style={{ background: "hsl(42 85% 46%)" }}
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 5.5, ease: "linear" }}
            />
          </div>
        )}
      </div>

    </section>
  );
}
