import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const STORAGE_KEY = "kp_launch_overlay_seen";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.45, delayChildren: 0.6 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] as const } },
};

const glowPulse = {
  hidden: { opacity: 0, scale: 0.92 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 1.2, ease: "easeOut" as const },
  },
};

export default function LaunchOverlay() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!user && !localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, [user]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  };

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

  if (user) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="launch-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5 } }}
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-zinc-950"
        >
          {/* Subtle radial glow */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_30%,hsl(42_85%_46%/0.06),transparent)]" />

          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="relative mx-auto flex min-h-[100dvh] max-w-xl flex-col items-center justify-center gap-10 px-6 py-16 text-center sm:gap-14 sm:py-24"
          >
            {/* Tagline */}
            <motion.p
              variants={glowPulse}
              className="text-xs font-medium uppercase tracking-[0.35em] text-[hsl(42_85%_56%/0.7)]"
            >
              Kingdom Prayers
            </motion.p>

            {/* Title */}
            <motion.h1
              variants={fadeUp}
              className="text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl"
            >
              KeepPray.ing
            </motion.h1>

            {/* Section 1 — The Problem */}
            <motion.p
              variants={fadeUp}
              className="max-w-md text-lg italic leading-relaxed text-zinc-300 sm:text-xl"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              When people say they are praying for us, it doesn't hold as much
              weight as it used to. At{" "}
              <span className="font-semibold not-italic text-[hsl(42_85%_56%)]">
                KeepPray.ing
              </span>{" "}
              we make it easy to write a prayer and share it — truly letting
              someone know you are praying for them and actually{" "}
              <em className="text-white">feel</em> it.
              <br />
              Even pray together.
            </motion.p>

            {/* Divider */}
            <motion.span
              variants={fadeUp}
              className="block h-px w-16 bg-[hsl(42_85%_46%/0.3)]"
            />

            {/* Section 2 — The Mission */}
            <motion.p
              variants={fadeUp}
              className="max-w-md text-base leading-relaxed text-zinc-400"
            >
              At{" "}
              <span className="text-[hsl(42_85%_56%)]">KeepPray.ing</span> we
              encourage the most fundamental aspects of our relationship with
              God and others. We are a biblically based, non-denomination
              ministry that supports and encourages your faith journey.
            </motion.p>

            {/* Section 3 — The Story */}
            <motion.p
              variants={fadeUp}
              className="max-w-md text-sm leading-relaxed text-zinc-500"
            >
              My name is John and I wanted to write my prayers down and be able
              to search through them. God took that and grew it into{" "}
              <span className="text-zinc-300">KeepPray.ing</span> and{" "}
              <span className="text-zinc-300">KeepRead.ing</span> — now both
              "useable" 😅😇. I made them live to grow and be tested by anyone.
              Soon, an update will change the whole look and make things feel
              natural. God bless you, and hopefully you now understand a part of
              what's going on here.
            </motion.p>

            {/* Waitlist CTA */}
            <motion.div variants={fadeUp} className="w-full max-w-sm">
              {submitted ? (
                <div className="flex items-center justify-center gap-2 text-sm text-[hsl(42_85%_56%)]">
                  <Check className="h-4 w-4" />
                  You're on the list — God bless you.
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="flex items-center gap-2"
                >
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
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Join Waitlist"
                    )}
                  </Button>
                </form>
              )}
              <p className="mt-2 text-xs text-zinc-600">
                Be notified when the official launch drops.
              </p>
            </motion.div>

            {/* Enter Site */}
            <motion.button
              variants={fadeUp}
              onClick={dismiss}
              className="group mt-4 flex items-center gap-1.5 text-xs text-zinc-600 transition-colors hover:text-zinc-400"
            >
              Enter Site
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
