import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { PenTool, Mic, Layers, Bookmark, Apple, Mail, Loader2 } from "lucide-react";
import { lovable } from "@/integrations/lovable/index";
import { useToast } from "@/hooks/use-toast";

const FADE_UP = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, damping: 25, stiffness: 100 },
  },
};

const STAGGER = {
  show: { transition: { staggerChildren: 0.08 } },
};

export default function KeepReadingLanding() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<"google" | "apple" | null>(null);

  const handleOAuth = async (provider: "google" | "apple") => {
    setLoading(provider);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast({
          title: "Sign-in failed",
          description: String((result.error as Error).message ?? result.error),
          variant: "destructive",
        });
        setLoading(null);
        return;
      }
      if (result.redirected) return;
    } catch (e: any) {
      toast({
        title: "Sign-in error",
        description: e?.message ?? "Something went wrong",
        variant: "destructive",
      });
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-emerald-500/30">
      {/* ── HERO ── */}
      <header className="relative max-w-7xl mx-auto px-6 pt-24 sm:pt-32 pb-20 text-center">
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ ...STAGGER, ...FADE_UP }}
          className="max-w-3xl mx-auto space-y-8"
        >
          <motion.h1
            variants={FADE_UP}
            className="font-serif text-5xl md:text-7xl font-medium tracking-tight text-white leading-tight"
          >
            Keep Reading.
            <br />
            <span className="text-emerald-500 italic">Go Deeper.</span>
          </motion.h1>

          <motion.p
            variants={FADE_UP}
            className="text-lg md:text-xl text-zinc-400 font-light leading-relaxed max-w-2xl mx-auto"
          >
            The only Bible study app that combines native Apple Pencil
            journaling with a spatially-aware scripture database.
            <br className="hidden sm:block" />
            The text is not the canvas any longer. Interact with God's word.
          </motion.p>

          <motion.div
            variants={FADE_UP}
            className="flex flex-col items-center gap-4 pt-4"
          >
            <button
              onClick={() => handleOAuth("google")}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-full text-lg font-medium transition-all shadow-[0_0_40px_rgba(16,185,129,0.3)] hover:shadow-[0_0_60px_rgba(16,185,129,0.5)] transform hover:scale-105"
            >
              Start Studying — It's Free
            </button>

            <div className="flex gap-3 mt-2">
              <button
                onClick={() => handleOAuth("apple")}
                disabled={!!loading}
                className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-full text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                {loading === "apple" ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Apple size={16} />
                )}
                Continue with Apple
              </button>
              <button
                onClick={() => handleOAuth("google")}
                disabled={!!loading}
                className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-full text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                {loading === "google" ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Mail size={16} />
                )}
                Continue with Google
              </button>
            </div>
          </motion.div>
        </motion.div>

        {/* Hero visual placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="mt-16 sm:mt-20 relative w-full max-w-5xl mx-auto aspect-video bg-zinc-900 rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden flex items-center justify-center"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-emerald-900/20 to-transparent z-0" />
          <p className="text-zinc-600 font-mono text-sm z-10 px-4 text-center">
            [ iPad Bible Study Preview Coming Soon ]
          </p>
        </motion.div>
      </header>

      {/* ── BENTO GRID ── */}
      <section className="max-w-7xl mx-auto px-6 py-16 sm:py-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[280px]">
          {/* Spatially Aware Ink (span 2) */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="md:col-span-2 bg-zinc-900 rounded-3xl p-8 border border-zinc-800 relative overflow-hidden group"
          >
            <div className="relative z-10">
              <PenTool className="text-emerald-500 mb-4" size={32} />
              <h3 className="font-serif text-2xl mb-2">Spatially Aware Ink</h3>
              <p className="text-zinc-400 max-w-sm">
                Your handwriting isn't just a layer. Circle a word to select it.
                Underline a verse to highlight it. The ink knows the scripture.
              </p>
            </div>
            <div className="absolute right-0 bottom-0 opacity-10 group-hover:opacity-20 transition-opacity">
              <svg
                width="300"
                height="200"
                viewBox="0 0 100 100"
                className="stroke-emerald-500 stroke-[0.5] fill-none"
              >
                <path d="M10,90 Q50,10 90,90" />
              </svg>
            </div>
          </motion.div>

          {/* Voice to Verse */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-zinc-900 rounded-3xl p-8 border border-zinc-800 flex flex-col justify-end relative overflow-hidden"
          >
            <Mic className="text-emerald-500 mb-4" size={32} />
            <h3 className="font-serif text-2xl mb-2">Voice to Verse</h3>
            <p className="text-zinc-400 text-sm">
              Speak your reflections. We auto-transcribe and link them to the
              exact verse you're studying.
            </p>
          </motion.div>

          {/* Verse Bunches */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-zinc-900 rounded-3xl p-8 border border-zinc-800"
          >
            <Layers className="text-emerald-500 mb-4" size={32} />
            <h3 className="font-serif text-2xl mb-2">Verse Bunches</h3>
            <p className="text-zinc-400 text-sm">
              Group verses across books and chapters for topical study or sermon
              prep.
            </p>
          </motion.div>

          {/* Bible Pocket (span 2) */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="md:col-span-2 bg-emerald-950 rounded-3xl p-8 border border-emerald-900 flex items-center overflow-hidden"
          >
            <div>
              <Bookmark className="text-emerald-400 mb-4" size={32} />
              <h3 className="font-serif text-2xl mb-2 text-emerald-50">
                The Bible Pocket
              </h3>
              <p className="text-emerald-200/80 max-w-sm">
                A unified drawer holding your journal, bookmarks, and guides.
                Never lose context.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── AUTHORITY SECTION ── */}
      <section className="max-w-7xl mx-auto px-6 py-16 sm:py-24">
        <div className="flex flex-col md:flex-row items-center gap-12 md:gap-16">
          <div className="flex-1 space-y-6">
            <h2 className="font-serif text-3xl md:text-4xl leading-tight text-white">
              Designed exclusively for the deep journaler.
            </h2>
            <p className="text-zinc-400 text-lg leading-relaxed">
              Most Bible apps are built for 5-minute morning commutes.
              KeepRead.ing is built for the hour-long deep dive. With perfect
              Apple Pencil integration, zero-latency rendering, and frictionless
              tools, it is the digital equivalent of your most trusted study
              Bible.
            </p>
          </div>
          <div className="flex-1 w-full aspect-square max-w-md bg-zinc-900 rounded-3xl border border-zinc-800 shadow-xl" />
        </div>
      </section>

      {/* ── FOOTER CTA ── */}
      <footer className="relative bg-zinc-900 border-t border-zinc-800 py-24 sm:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-emerald-950/20" />
        <div className="relative z-10 max-w-3xl mx-auto text-center px-6 space-y-8">
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-white">
            Ready to change how you study?
          </h2>
          <div className="flex flex-col items-center gap-4 pt-4">
            <button
              onClick={() => handleOAuth("google")}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-full text-lg font-medium transition-all transform hover:scale-105"
            >
              Start Studying Now
            </button>
            <p className="text-zinc-500 text-sm mt-4">
              No credit card required. Syncs across all your devices.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
