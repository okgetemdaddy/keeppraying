/**
 * Index — Marketing landing page for KeepPray.ing (desktop).
 * Mobile users redirect to /boardv2 via App.tsx.
 * Authenticated desktop users redirect to /board.
 */

import { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion, useInView } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Mic, PenTool, Type, Lock, Share2, Sparkles, MessageCircle, Users, LogIn, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const BRAND_SAYINGS = [
  "KeepPray.ing",
  "Keep Believing",
  "Keep Trusting",
  "Keep Hoping",
  "Keep Seeking",
  "Keep Praising",
  "Keep Standing",
];

const FEATURES = [
  { icon: Mic, title: "Voice Prayers", description: "Record your prayers in your own voice." },
  { icon: PenTool, title: "Handwritten", description: "Write prayers by hand on a digital canvas." },
  { icon: Type, title: "Typed Prayers", description: "Type your prayers with rich formatting." },
  { icon: Lock, title: "Private & Sacred", description: "Your prayer closet is fully private." },
  { icon: Share2, title: "Share Your Prayer", description: "Send a prayer so they FEEL you're praying." },
  { icon: Sparkles, title: "Testify", description: "When God answers, flip the card and testify." },
  { icon: MessageCircle, title: "Encourage", description: "Build each other up in faith and love." },
  { icon: Users, title: "Prayer Circles", description: "Gather for accountability and community." },
];

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1] as const } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } };

function Divider() {
  return <div className="mx-auto h-px w-16" style={{ background: "var(--kp-border-gold)" }} />;
}

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [sayingIdx, setSayingIdx] = useState(0);
  const [liveStats, setLiveStats] = useState({ prayers: 0, users: 0 });

  useEffect(() => {
    if (!loading && user) navigate("/board", { replace: true });
  }, [user, loading, navigate]);

  // Rotate brand sayings
  useEffect(() => {
    const id = setInterval(() => setSayingIdx((i) => (i + 1) % BRAND_SAYINGS.length), 5000);
    return () => clearInterval(id);
  }, []);

  // Fetch live stats
  useEffect(() => {
    (async () => {
      const [{ count: prayerCount }, { count: userCount }] = await Promise.all([
        supabase.from("prayer_cards").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);
      setLiveStats({ prayers: prayerCount ?? 0, users: userCount ?? 0 });
    })();
  }, []);

  if (loading || user) return null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--kp-bg-deep)", color: "var(--kp-text-primary)" }}>
      {/* Radial glow */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_25%,rgba(180,140,50,0.04),transparent)]" />

      {/* Top nav */}
      <div className="relative z-10 flex items-center justify-between px-8 py-5">
        <span className="text-sm font-bold tracking-tight" style={{ fontFamily: "var(--kp-font-display)", color: "var(--kp-gold)" }}>
          KeepPray.ing
        </span>
        <Link
          to="/auth"
          className="flex items-center gap-1.5 text-xs font-medium transition-colors"
          style={{ color: "var(--kp-text-muted)" }}
        >
          <LogIn className="h-3.5 w-3.5" />
          Sign In
        </Link>
      </div>

      {/* Hero */}
      <motion.section
        variants={stagger}
        initial="hidden"
        animate="show"
        className="relative z-10 flex flex-col items-center justify-center gap-6 px-6 pt-12 pb-24 text-center"
      >
        {/* Rotating saying */}
        <motion.div variants={fadeUp} className="h-12 flex items-center justify-center overflow-hidden">
          <motion.span
            key={sayingIdx}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.6 }}
            className="text-4xl sm:text-6xl font-bold tracking-tight"
            style={{ fontFamily: "var(--kp-font-display)" }}
          >
            {sayingIdx === 0 ? (
              <>Keep<span style={{ color: "var(--kp-gold)" }}>Pray</span>.ing</>
            ) : (
              <span style={{ color: "var(--kp-text-primary)" }}>{BRAND_SAYINGS[sayingIdx]}</span>
            )}
          </motion.span>
        </motion.div>

        <motion.p
          variants={fadeUp}
          className="max-w-lg text-lg sm:text-xl leading-relaxed italic"
          style={{ fontFamily: "var(--kp-font-prayer)", color: "var(--kp-text-body)" }}
        >
          When people say they are praying for us, it doesn't hold as much
          weight as it used to. We're changing that.
        </motion.p>

        {/* Live stats */}
        {(liveStats.prayers > 0 || liveStats.users > 0) && (
          <motion.div variants={fadeUp} className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: "var(--kp-gold)" }}>
                {liveStats.prayers.toLocaleString()}
              </p>
              <p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--kp-text-muted)" }}>
                Prayers Written
              </p>
            </div>
            <div className="w-px h-8" style={{ background: "var(--kp-border)" }} />
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: "var(--kp-gold)" }}>
                {liveStats.users.toLocaleString()}
              </p>
              <p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--kp-text-muted)" }}>
                Prayer Warriors
              </p>
            </div>
          </motion.div>
        )}

        <motion.div variants={fadeUp}>
          <Link to="/auth">
            <Button
              className="rounded-xl h-12 px-8 text-base font-semibold gap-2"
              style={{ background: "var(--kp-gold)", color: "var(--kp-bg-deep)" }}
            >
              Begin Your Prayer Journey <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </motion.div>
      </motion.section>

      <Divider />

      {/* Features */}
      <section className="relative z-10 py-20 px-6">
        <div className="text-center mb-14">
          <p className="text-[10px] uppercase tracking-[0.35em] mb-3" style={{ color: "var(--kp-text-muted)" }}>
            Everything you need
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ fontFamily: "var(--kp-font-display)" }}>
            Your Prayer Room, Reimagined
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-12 gap-x-4 max-w-4xl mx-auto">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="flex flex-col items-center text-center gap-3 px-4">
                <div
                  className="flex items-center justify-center w-14 h-14 rounded-2xl"
                  style={{
                    background: "var(--kp-gold-glow)",
                    border: "1px solid var(--kp-border-gold)",
                  }}
                >
                  <Icon className="w-6 h-6" style={{ color: "var(--kp-gold)" }} />
                </div>
                <h3 className="text-sm font-semibold" style={{ color: "var(--kp-text-primary)" }}>{f.title}</h3>
                <p className="text-sm leading-relaxed max-w-[260px]" style={{ color: "var(--kp-text-muted)" }}>{f.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <Divider />

      {/* Mission */}
      <section className="relative z-10 py-20 px-6 max-w-2xl mx-auto text-center">
        <p className="text-[10px] uppercase tracking-[0.35em] mb-6" style={{ color: "var(--kp-text-muted)" }}>
          Our Heart
        </p>
        <p className="text-base sm:text-lg leading-relaxed" style={{ color: "var(--kp-text-body)" }}>
          At{" "}
          <span className="font-semibold" style={{ color: "var(--kp-gold)" }}>KeepPray.ing</span>{" "}
          we encourage the most fundamental aspects of our relationship with
          God and others. We are a biblically based, non-denomination
          ministry that supports and encourages your faith journey.
        </p>
      </section>

      <Divider />

      {/* Final CTA */}
      <section className="relative z-10 py-20 px-6 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4" style={{ fontFamily: "var(--kp-font-display)" }}>
          Ready to <span style={{ color: "var(--kp-gold)" }}>pray</span>?
        </h2>
        <Link to="/auth">
          <Button
            className="rounded-xl h-12 px-8 text-base font-semibold gap-2"
            style={{ background: "var(--kp-gold)", color: "var(--kp-bg-deep)" }}
          >
            Get Started Free <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-8 text-center" style={{ borderTop: "1px solid var(--kp-border)" }}>
        <p className="text-[11px]" style={{ color: "var(--kp-text-muted)" }}>
          © {new Date().getFullYear()} KeepPray.ing — A Kingdom Ministry
        </p>
      </footer>
    </div>
  );
}
