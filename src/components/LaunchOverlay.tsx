import { useState, useEffect, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Loader2, Check, Mic, PenTool, Type, Lock, Unlock,
  Share2, MessageCircle, Users, Sparkles, ArrowRight, LogIn
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

/* ─── Animation variants ─────────────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1] as const } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

/* ─── 3D Prayer Card ─────────────────────────────────────────────────── */
function PrayerCard3D() {
  const [flipped, setFlipped] = useState(false);
  const [autoFlip, setAutoFlip] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!autoFlip) return;
    intervalRef.current = setInterval(() => setFlipped(p => !p), 5000);
    return () => clearInterval(intervalRef.current);
  }, [autoFlip]);

  const handleClick = () => {
    setAutoFlip(false);
    setFlipped(p => !p);
  };

  return (
    <div
      className="relative w-[320px] h-[440px] sm:w-[380px] sm:h-[500px] cursor-pointer mx-auto"
      style={{ perspective: "1200px" }}
      onClick={handleClick}
    >
      <motion.div
        className="absolute inset-0 w-full h-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Front — Prayer */}
        <div
          className="absolute inset-0 rounded-2xl overflow-hidden"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            willChange: "transform",
            transform: "translateZ(0)",
          }}
        >
          <div className="absolute inset-0 bg-[hsl(25_35%_10%)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-[hsl(25_35%_12%)] via-[hsl(25_30%_14%)] to-[hsl(25_35%_8%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_20%,hsl(42_85%_46%/0.08),transparent)]" />
          {/* Top edge light */}
          <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[hsl(42_85%_56%/0.4)] to-transparent" />
          {/* Inner border glow */}
          <div className="absolute inset-0 rounded-2xl border border-[hsl(42_85%_46%/0.2)] shadow-[inset_0_1px_0_0_hsl(42_85%_56%/0.1),inset_0_-1px_0_0_hsl(25_35%_5%/0.5)]" />
          {/* Outer depth shadow */}
          <div className="absolute -inset-px rounded-2xl shadow-[0_4px_20px_-4px_hsl(0_0%_0%/0.6),0_8px_40px_-8px_hsl(0_0%_0%/0.4),0_0_15px_-3px_hsl(42_85%_46%/0.1)]" style={{ pointerEvents: "none" }} />
          <div className="relative z-10 flex flex-col h-full p-8 sm:p-10">
            <p className="text-[10px] uppercase tracking-[0.4em] text-[hsl(42_85%_56%/0.5)] mb-2">
              KeepPray.ing
            </p>
            <h3 className="text-lg sm:text-xl font-bold text-white/90 mb-6">
              A Prayer for My Family
            </h3>
            <p
              className="flex-1 text-base sm:text-lg leading-relaxed text-white/70"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              Lord, watch over my family today. Guard their hearts, guide their
              steps, and fill our home with Your peace. Help us to love each
              other well and to keep You at the center of everything we do.
              In Jesus' name, Amen.
            </p>
            <div className="mt-6 flex items-center gap-3 text-xs text-white/30">
              <span>🙏 2,103 prayed</span>
              <span>·</span>
              <span>❤️ 847 amen</span>
            </div>
          </div>
        </div>

        {/* Back — Testimony */}
        <div
          className="absolute inset-0 rounded-2xl overflow-hidden"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            willChange: "transform",
          }}
        >
          <div className="absolute inset-0 bg-[hsl(42_50%_6%)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-[hsl(42_50%_8%)] via-[hsl(42_40%_12%)] to-[hsl(42_50%_6%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_50%_40%,hsl(42_85%_46%/0.12),transparent)]" />
          <div className="absolute top-4 right-4 w-20 h-20 rounded-full bg-[hsl(42_85%_46%/0.06)] blur-2xl" />
          {/* Top edge light */}
          <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[hsl(42_85%_56%/0.5)] to-transparent" />
          {/* Inner border glow */}
          <div className="absolute inset-0 rounded-2xl border border-[hsl(42_85%_46%/0.3)] shadow-[inset_0_1px_0_0_hsl(42_85%_56%/0.15),inset_0_-1px_0_0_hsl(42_50%_4%/0.5)]" />
          {/* Outer depth shadow */}
          <div className="absolute -inset-px rounded-2xl shadow-[0_4px_20px_-4px_hsl(0_0%_0%/0.6),0_8px_40px_-8px_hsl(0_0%_0%/0.4),0_0_15px_-3px_hsl(42_85%_46%/0.15)]" style={{ pointerEvents: "none" }} />
          <div className="relative z-10 flex flex-col h-full p-8 sm:p-10">
            <p className="text-[10px] uppercase tracking-[0.4em] text-[hsl(42_85%_56%/0.7)] mb-2">
              Testimony
            </p>
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="h-5 w-5 text-[hsl(42_85%_56%)]" />
              <h3 className="text-lg sm:text-xl font-bold text-[hsl(42_85%_70%)]">
                God Answered
              </h3>
            </div>
            <p className="flex-1 text-base sm:text-lg leading-relaxed text-white/70">
              My mother was diagnosed with stage 3 cancer. Our family prayed
              every single day. After 6 months of treatment, the doctors found
              no trace of cancer. God is faithful. He hears every prayer.
            </p>
            <div className="mt-6 pt-4 border-t border-[hsl(42_85%_46%/0.15)]">
              <p className="text-xs text-[hsl(42_85%_56%/0.5)] italic">
                "Call to me and I will answer you" — Jeremiah 33:3
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tap hint */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="absolute -bottom-8 left-0 right-0 text-center text-[11px] text-zinc-500"
      >
        tap to flip
      </motion.p>
    </div>
  );
}

/* ─── Feature Row ────────────────────────────────────────────────────── */
interface FeatureItemProps {
  icon: React.ElementType;
  title: string;
  description: string;
}

function FeatureItem({ icon: Icon, title, description }: FeatureItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center text-center gap-3 px-4"
    >
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-[hsl(42_85%_46%/0.08)] border border-[hsl(42_85%_46%/0.15)]">
        <Icon className="w-6 h-6 text-[hsl(42_85%_56%)]" />
      </div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="text-sm leading-relaxed text-zinc-400 max-w-[260px]">{description}</p>
    </motion.div>
  );
}

/* ─── Waitlist Form ──────────────────────────────────────────────────── */
function WaitlistForm({ className = "" }: { className?: string }) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      await supabase.from("waitlist_signups").insert({
        email: trimmed,
        platform: "keeppray_launch",
      });
      setSubmitted(true);
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className={`flex items-center justify-center gap-2 text-sm text-[hsl(42_85%_56%)] ${className}`}>
        <Check className="h-4 w-4" />
        You're on the list — God bless you.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`flex items-center gap-2 ${className}`}>
      <Input
        type="email"
        required
        placeholder="your@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-600 focus-visible:ring-[hsl(42_85%_46%/0.4)]"
      />
      <Button
        type="submit"
        disabled={submitting}
        className="shrink-0 bg-[hsl(42_85%_46%)] text-zinc-950 hover:bg-[hsl(42_85%_56%)]"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join Waitlist"}
      </Button>
    </form>
  );
}

/* ─── Section Divider ────────────────────────────────────────────────── */
function Divider() {
  return <div className="mx-auto h-px w-16 bg-[hsl(42_85%_46%/0.2)]" />;
}

/* ─── Features Data ──────────────────────────────────────────────────── */
const FEATURES: FeatureItemProps[] = [
  { icon: Mic, title: "Voice Prayers", description: "Record your prayers in your own voice. Let every word carry your heart's emotion." },
  { icon: PenTool, title: "Handwritten", description: "Write prayers by hand on a digital canvas. As personal as pen on paper." },
  { icon: Type, title: "Typed Prayers", description: "Type your prayers with rich formatting. Clear, searchable, and always accessible." },
  { icon: Lock, title: "Private & Sacred", description: "Keep prayers between you and God. Your prayer closet is fully private." },
  { icon: Share2, title: "Share Your Prayer", description: "Send a prayer to someone and let them truly FEEL that you are praying for them." },
  { icon: Sparkles, title: "Testify", description: "When God answers, flip the card and share your testimony with the world." },
  { icon: MessageCircle, title: "Comment & Encourage", description: "Leave words of encouragement. Build each other up in faith and love." },
  { icon: Users, title: "Prayer Circles", description: "Gather in groups for accountability, unity, and community prayer." },
];

/* ═══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════ */
export default function LaunchOverlay() {
  const heroRef = useRef<HTMLDivElement>(null);
  const storyRef = useRef<HTMLDivElement>(null);
  const storyInView = useInView(storyRef, { once: true, margin: "-80px" });

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* ── Radial glow ─────────────────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_25%,hsl(42_85%_46%/0.04),transparent)]" />

      {/* ── Top bar (login link) ────────────────────────────────────── */}
      <div className="relative z-10 flex items-center justify-end px-6 py-4">
        <Link
          to="/auth"
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <LogIn className="h-3.5 w-3.5" />
          Sign In
        </Link>
      </div>

      {/* ── Hero Section ────────────────────────────────────────────── */}
      <motion.section
        ref={heroRef}
        variants={stagger}
        initial="hidden"
        animate="show"
        className="relative z-10 flex flex-col items-center justify-center gap-8 px-6 pt-8 pb-20 sm:pt-16 sm:pb-32 text-center"
      >
        <motion.p
          variants={fadeUp}
          className="text-[10px] sm:text-xs font-medium uppercase tracking-[0.4em] text-[hsl(42_85%_56%/0.6)]"
        >
          Kingdom Prayers
        </motion.p>

        <motion.h1
          variants={fadeUp}
          className="text-4xl sm:text-6xl font-bold tracking-tight"
        >
          Keep<span className="text-[hsl(42_85%_56%)]">Pray</span>.ing
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="max-w-lg text-lg sm:text-xl leading-relaxed text-zinc-300 italic"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          When people say they are praying for us, it doesn't hold as much
          weight as it used to. We're changing that.
        </motion.p>

        {/* 3D Prayer Card */}
        <motion.div variants={fadeUp} className="mt-4 mb-4">
          <PrayerCard3D />
        </motion.div>

        <motion.p
          variants={fadeUp}
          className="max-w-md text-sm text-zinc-500 leading-relaxed"
        >
          A prayer on one side. A testimony on the other.{" "}
          <span className="text-[hsl(42_85%_56%)]">The power of prayer</span>,
          made tangible.
        </motion.p>

        {/* Waitlist — Hero */}
        <motion.div variants={fadeUp} className="w-full max-w-sm mt-2">
          <WaitlistForm />
          <p className="mt-2 text-[11px] text-zinc-600 text-center">
            Be first to know when we officially launch.
          </p>
        </motion.div>
      </motion.section>

      <Divider />

      {/* ── Feature Showcase ────────────────────────────────────────── */}
      <section className="relative z-10 py-20 sm:py-28 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7 }}
          className="text-center mb-14 sm:mb-20"
        >
          <p className="text-[10px] uppercase tracking-[0.35em] text-[hsl(42_85%_56%/0.5)] mb-3">
            Everything you need
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Your Prayer Room, Reimagined
          </h2>
          <p className="mt-4 max-w-md mx-auto text-sm text-zinc-500 leading-relaxed">
            Write, speak, or draw your prayers. Keep them private or share them
            with the world. When God answers, testify.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-12 gap-x-4 max-w-4xl mx-auto">
          {FEATURES.map((f) => (
            <FeatureItem key={f.title} {...f} />
          ))}
        </div>
      </section>

      <Divider />

      {/* ── The Mission ─────────────────────────────────────────────── */}
      <section className="relative z-10 py-20 sm:py-28 px-6 max-w-2xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8 }}
          className="space-y-6"
        >
          <p className="text-[10px] uppercase tracking-[0.35em] text-[hsl(42_85%_56%/0.5)]">
            Our Heart
          </p>
          <p className="text-base sm:text-lg leading-relaxed text-zinc-300">
            At{" "}
            <span className="text-[hsl(42_85%_56%)] font-semibold">KeepPray.ing</span>{" "}
            we encourage the most fundamental aspects of our relationship with
            God and others. We are a biblically based, non-denomination
            ministry that supports and encourages your faith journey.
          </p>
          <p className="text-base sm:text-lg leading-relaxed text-zinc-300">
            KeepPray.ing is a ministry to foster a deeper desire to talk with
            God and invite Him to do the miraculous.
          </p>
        </motion.div>
      </section>

      <Divider />

      {/* ── Founder's Story ─────────────────────────────────────────── */}
      <section ref={storyRef} className="relative z-10 py-20 sm:py-28 px-6 max-w-xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={storyInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.9 }}
          className="space-y-5"
        >
          <p className="text-[10px] uppercase tracking-[0.35em] text-[hsl(42_85%_56%/0.5)]">
            The Story
          </p>
          <p className="text-sm leading-relaxed text-zinc-500">
            My name is John and I wanted to write my prayers down and be able
            to search through them. God took that and grew it into{" "}
            <span className="text-zinc-300">KeepPray.ing</span> and{" "}
            <span className="text-zinc-300">KeepRead.ing</span> — now both
            "useable" 😅😇. I made them live to grow and be tested by anyone.
            Soon, an update will change the whole look and make things feel
            natural. God bless you, and hopefully you now understand a part of
            what's going on here.
          </p>
        </motion.div>
      </section>

      <Divider />

      {/* ── Final CTA ───────────────────────────────────────────────── */}
      <section className="relative z-10 py-20 sm:py-28 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="space-y-6"
        >
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Ready to <span className="text-[hsl(42_85%_56%)]">pray</span>?
          </h2>
          <p className="text-sm text-zinc-500 max-w-md mx-auto">
            Join the waitlist and be among the first to experience prayer like
            never before.
          </p>
          <WaitlistForm className="max-w-sm mx-auto" />
        </motion.div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-zinc-900 py-8 text-center">
        <p className="text-[11px] text-zinc-700">
          © {new Date().getFullYear()} KeepPray.ing — A Kingdom Ministry
        </p>
      </footer>
    </div>
  );
}
