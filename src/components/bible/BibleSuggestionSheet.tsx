import React, { useState } from "react";
import { Send, Heart, Lightbulb, Bug, Pencil, Keyboard, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface BibleSuggestionSheetProps {
  open: boolean;
  onClose: () => void;
}

type Category = "suggestion" | "bug";

export function BibleSuggestionSheet({ open, onClose }: BibleSuggestionSheetProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<Category>("suggestion");
  const [typingMode, setTypingMode] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) return;
    if (!user) {
      toast.error("Please sign in to submit.");
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.from("feedback_submissions").insert({
        user_id: user.id,
        feedback_type: category === "bug" ? "bible_bug" : "bible_suggestion",
        title: title.trim() || null,
        message: message.trim(),
      });

      if (error) throw error;

      setSent(true);
      setTimeout(() => {
        resetAndClose();
      }, 2500);
    } catch (err: any) {
      toast.error("Could not send — please try again.");
      console.error("Suggestion submit error:", err);
    } finally {
      setSending(false);
    }
  };

  const resetAndClose = () => {
    setSent(false);
    setTitle("");
    setMessage("");
    setCategory("suggestion");
    setTypingMode(false);
    onClose();
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) resetAndClose();
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="left"
        className="w-[380px] sm:w-[420px] overflow-y-auto p-0 bg-black/40 backdrop-blur-[24px] backdrop-brightness-[0.8] border-r border-white/10 shadow-2xl"
      >
        {sent ? (
          /* ── Thank-you state ── */
          <div className="flex flex-col items-center justify-center h-full py-20 px-6 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
              <Heart className="h-8 w-8 text-amber-400/80" />
            </div>
            <h3 className="text-lg font-bold text-white/90">
              God bless you 🙏
            </h3>
            <p className="mt-3 text-sm text-white/50 max-w-xs leading-relaxed">
              Thank you for blessing KeepRead.ing with your heart.
              Your words carry weight and we're grateful for every one.
            </p>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* ── Header ── */}
            <SheetHeader className="px-6 pt-6 pb-4 border-b border-white/10">
              <SheetTitle className="text-[0.95rem] font-bold tracking-tight flex items-center gap-2 text-white/90">
                <Lightbulb className="h-4 w-4 text-amber-400/70" />
                Suggestions & Bugs
              </SheetTitle>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* ── iOS Segmented Control ── */}
              <div className="relative flex rounded-full bg-white/5 p-1">
                {/* Sliding highlight */}
                <div
                  className="absolute top-1 bottom-1 rounded-full bg-white/15 transition-all duration-200 ease-out"
                  style={{
                    left: category === "suggestion" ? "4px" : "50%",
                    width: "calc(50% - 4px)",
                  }}
                />
                <button
                  onClick={() => setCategory("suggestion")}
                  className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    category === "suggestion" ? "text-white" : "text-white/50"
                  }`}
                >
                  <Lightbulb className="h-3 w-3" />
                  Suggestion
                </button>
                <button
                  onClick={() => setCategory("bug")}
                  className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    category === "bug" ? "text-white" : "text-white/50"
                  }`}
                >
                  <Bug className="h-3 w-3" />
                  Bug Report
                </button>
              </div>

              {/* ── Title ── */}
              <div>
                <label className="text-xs font-medium text-white/40 mb-1.5 block">
                  Title <span className="text-white/25">(optional)</span>
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={category === "bug" ? "e.g. Verses not loading" : "e.g. Split-screen translations"}
                  maxLength={120}
                  className="h-9 text-sm border-none bg-white/5 shadow-inner rounded-lg text-white/90 placeholder:text-white/25 focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:ring-offset-0"
                />
              </div>

              {/* ── Writing canvas ── */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-white/40">
                    {category === "bug" ? "Describe the bug" : "Your suggestion"}
                  </label>
                  <button
                    onClick={() => setTypingMode(!typingMode)}
                    className="flex items-center gap-1 text-[0.6rem] text-white/30 hover:text-white/60 transition-colors"
                  >
                    {typingMode ? (
                      <>
                        <Pencil className="h-2.5 w-2.5" /> Use pencil
                      </>
                    ) : (
                      <>
                        <Keyboard className="h-2.5 w-2.5" /> Prefer to type?
                      </>
                    )}
                  </button>
                </div>

                <div className="relative">
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={
                      typingMode
                        ? "Type your thoughts here…"
                        : "Write freely…"
                    }
                    className={`resize-none text-sm border-none bg-white/[0.03] shadow-[inset_0_1px_3px_rgba(0,0,0,0.2)] rounded-lg text-white/90 placeholder:text-white/25 focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:ring-offset-0 transition-all ${
                      typingMode ? "min-h-[120px]" : "min-h-[200px]"
                    }`}
                    style={
                      !typingMode
                        ? {
                            backgroundImage:
                              "radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)",
                            backgroundSize: "20px 20px",
                          }
                        : undefined
                    }
                    maxLength={2000}
                  />

                  {/* Apple Pencil micro-copy inside textarea */}
                  {!typingMode && (
                    <span
                      className={`absolute bottom-2 right-3 flex items-center gap-1 text-[0.55rem] text-white/30 pointer-events-none transition-opacity duration-300 ${
                        message.length > 0 ? "opacity-0" : "opacity-100"
                      }`}
                    >
                      <Pencil className="h-2 w-2" />
                      Apple Pencil supported ✏️
                    </span>
                  )}
                </div>
              </div>

              {/* ── Sign-in warning ── */}
              {!user && (
                <p className="text-xs text-amber-400/70">
                  You'll need to sign in to submit.
                </p>
              )}
            </div>

            {/* ── Submit + Footer ── */}
            <div className="px-6 py-4 border-t border-white/10 space-y-3">
              <button
                onClick={handleSubmit}
                disabled={!message.trim() || sending || !user}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium bg-amber-700/30 border border-amber-500/20 text-amber-200/90 hover:bg-amber-600/50 hover:text-amber-100 disabled:opacity-30 transition-all duration-200"
              >
                <Send className="h-3.5 w-3.5" />
                {sending ? "Sending…" : category === "bug" ? "Report Bug" : "Send Suggestion"}
              </button>

              {/* Sleek footer note */}
              <p className="text-[0.6rem] text-white/30 leading-relaxed flex items-start gap-1.5">
                <Sparkles className="h-3 w-3 mt-px shrink-0 text-white/20" />
                <span>
                  Every suggestion is prayerfully considered by our team. Bugs are fixed as soon as we know about them. Thank you for helping refine this space.
                </span>
              </p>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
