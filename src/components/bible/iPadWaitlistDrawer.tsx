import React, { useState } from "react";
import { X, Tablet, PenTool, Wifi, Layout, Sparkles, Bell, ArrowRight, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveSheet,
  ResponsiveSheetContent,
  ResponsiveSheetHeader,
  ResponsiveSheetTitle,
  ResponsiveSheetDescription,
} from "@/components/ui/responsive-sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const FEATURES = [
  { icon: PenTool, title: "Apple Pencil Precision", desc: "Pressure-sensitive inking with tilt shading for margin notes" },
  { icon: Wifi, title: "Offline Chapters", desc: "Download entire books for reading without internet" },
  { icon: Layout, title: "Split View Support", desc: "Study side-by-side with notes, sermons, or commentary" },
  { icon: Bell, title: "Siri Shortcuts", desc: "\"Hey Siri, open my prayer board\" — hands-free devotion" },
  { icon: Sparkles, title: "Native Haptics", desc: "Subtle tactile feedback when you bookmark, highlight, or pray" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IPadWaitlistDrawer({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email");
      return;
    }
    setLoading(true);
    setError("");
    const { error: dbError } = await supabase
      .from("waitlist_signups" as any)
      .insert({ email: trimmed, platform: "ipados", user_id: user?.id ?? null } as any);

    setLoading(false);
    if (dbError) {
      if (dbError.code === "23505") {
        setSubmitted(true);
        localStorage.setItem("ipad_waitlist_dismissed", "true");
      } else {
        setError("Something went wrong. Please try again.");
      }
      return;
    }
    setSubmitted(true);
    localStorage.setItem("ipad_waitlist_dismissed", "true");
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after close animation
    setTimeout(() => { setSubmitted(false); setEmail(""); setError(""); }, 300);
  };

  return (
    <ResponsiveSheet open={open} onOpenChange={handleClose}>
      <ResponsiveSheetContent side="left" className="w-[85vw] sm:w-[420px] p-0 overflow-y-auto">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-3 top-3 z-10 rounded-full p-1.5 hover:bg-muted/60 transition-colors"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>

        <div className="px-6 pt-8 pb-10 space-y-6">
          {/* Header */}
          <ResponsiveSheetHeader className="p-0 space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/40">
                <Tablet className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <ResponsiveSheetTitle className="text-lg font-serif text-foreground">
                  Native iPadOS App
                </ResponsiveSheetTitle>
                <ResponsiveSheetDescription className="text-xs text-muted-foreground">
                  A purpose-built experience is coming
                </ResponsiveSheetDescription>
              </div>
            </div>
          </ResponsiveSheetHeader>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Everything you love about KeepPray.ing — reimagined for iPad hardware. 
            Purpose-built for deep Bible study sessions.
          </p>

          {/* Features */}
          <div className="space-y-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 px-3.5 py-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100/80 dark:bg-amber-900/30">
                  <f.icon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{f.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Signup / Thank you */}
          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div
                key="thanks"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50/80 dark:bg-amber-950/30 p-5 text-center space-y-2"
              >
                <Check className="h-8 w-8 text-amber-600 dark:text-amber-400 mx-auto" />
                <p className="text-sm font-serif font-medium text-foreground">
                  God bless your study journey
                </p>
                <p className="text-xs text-muted-foreground">
                  We'll notify you when the iPad app is ready. 🕊️
                </p>
              </motion.div>
            ) : (
              <motion.div key="form" exit={{ opacity: 0 }} className="space-y-2">
                <p className="text-xs font-medium text-foreground">Get notified when it launches</p>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    className="flex-1 h-10 text-sm"
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  />
                  <Button
                    onClick={handleSubmit}
                    disabled={loading}
                    size="icon"
                    className="h-10 w-10 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-lg shrink-0"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
                {error && <p className="text-xs text-destructive">{error}</p>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ResponsiveSheetContent>
    </ResponsiveSheet>
  );
}

/** Compact inline waitlist input for the Bible Sleeve */
export function SleeveWaitlistInput() {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(
    () => localStorage.getItem("ipad_waitlist_dismissed") === "true"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Valid email required");
      return;
    }
    setLoading(true);
    setError("");
    const { error: dbError } = await supabase
      .from("waitlist_signups" as any)
      .insert({ email: trimmed, platform: "ipados", user_id: user?.id ?? null } as any);
    setLoading(false);
    if (dbError && dbError.code !== "23505") {
      setError("Try again later");
      return;
    }
    setSubmitted(true);
    localStorage.setItem("ipad_waitlist_dismissed", "true");
  };

  if (submitted) {
    return (
      <div className="rounded-lg border border-amber-200/60 dark:border-amber-800/30 bg-amber-50/50 dark:bg-amber-950/20 px-3 py-2.5 text-center">
        <p className="text-xs text-muted-foreground">
          🕊️ You're on the iPad waitlist. God bless your journey.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Tablet className="h-3.5 w-3.5 text-amber-500" />
        <span className="text-xs font-medium text-foreground">Native iPad App — Coming Soon</span>
      </div>
      <div className="flex gap-1.5">
        <Input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(""); }}
          className="flex-1 h-8 text-xs"
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
        <Button
          onClick={handleSubmit}
          disabled={loading}
          size="icon"
          className="h-8 w-8 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-md shrink-0"
        >
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
      {error && <p className="text-[0.65rem] text-destructive">{error}</p>}
    </div>
  );
}
