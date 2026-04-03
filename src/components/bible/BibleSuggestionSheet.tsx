import React, { useState } from "react";
import { Send, Heart, Lightbulb, Bug, Pencil, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
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
      <SheetContent side="left" className="w-[380px] sm:w-[420px] overflow-y-auto p-0">
        {sent ? (
          /* ── Thank-you state ── */
          <div className="flex flex-col items-center justify-center h-full py-20 px-6 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Heart className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-foreground">
              God bless you 🙏
            </h3>
            <p className="mt-3 text-sm text-muted-foreground max-w-xs leading-relaxed">
              Thank you for blessing KeepRead.ing with your heart.
              Your words carry weight and we're grateful for every one.
            </p>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* ── Header ── */}
            <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
              <SheetTitle className="text-lg font-bold tracking-tight flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                Suggestions & Bugs
              </SheetTitle>
              <SheetDescription className="text-sm text-muted-foreground leading-relaxed">
                Help us shape KeepRead.ing
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* ── Category toggle ── */}
              <div className="flex gap-2">
                <button
                  onClick={() => setCategory("suggestion")}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors border ${
                    category === "suggestion"
                      ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-transparent"
                      : "bg-transparent text-muted-foreground border-border hover:bg-muted"
                  }`}
                >
                  <Lightbulb className="h-3.5 w-3.5" />
                  Suggestion
                </button>
                <button
                  onClick={() => setCategory("bug")}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors border ${
                    category === "bug"
                      ? "bg-red-600 text-white border-transparent"
                      : "bg-transparent text-muted-foreground border-border hover:bg-muted"
                  }`}
                >
                  <Bug className="h-3.5 w-3.5" />
                  Bug Report
                </button>
              </div>

              {/* ── Title ── */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Title <span className="text-muted-foreground/60">(optional)</span>
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={category === "bug" ? "e.g. Verses not loading" : "e.g. Split-screen translations"}
                  maxLength={120}
                  className="h-9 text-sm"
                />
              </div>

              {/* ── Writing canvas ── */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    {category === "bug" ? "Describe the bug" : "Your suggestion"}{" "}
                    <span className="text-destructive">*</span>
                  </label>
                  <button
                    onClick={() => setTypingMode(!typingMode)}
                    className="flex items-center gap-1 text-[0.65rem] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {typingMode ? (
                      <>
                        <Pencil className="h-3 w-3" /> Use pencil
                      </>
                    ) : (
                      <>
                        <Keyboard className="h-3 w-3" /> Prefer to type?
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
                        : "Write with Apple Pencil or type here…"
                    }
                    className={`resize-none text-sm transition-all ${
                      typingMode
                        ? "min-h-[120px]"
                        : "min-h-[200px]"
                    }`}
                    style={
                      !typingMode
                        ? {
                            backgroundImage:
                              "radial-gradient(circle, hsl(var(--muted-foreground) / 0.12) 1px, transparent 1px)",
                            backgroundSize: "20px 20px",
                          }
                        : undefined
                    }
                    maxLength={2000}
                  />
                </div>

                {!typingMode && (
                  <p className="mt-1.5 text-[0.6rem] text-muted-foreground/70 flex items-center gap-1">
                    <Pencil className="h-2.5 w-2.5" />
                    Apple Pencil supported — handwriting auto-converts to text ✏️
                  </p>
                )}
              </div>

              {/* ── Heartfelt copy ── */}
              <div className="rounded-xl bg-muted/50 border border-border/50 p-4 space-y-3">
                {/* Cross SVG accent */}
                <div className="flex justify-center mb-1">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-primary/40">
                    <path d="M12 2v20M5 9h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed text-center">
                  <span className="font-semibold text-foreground/80">Every suggestion is prayerfully considered</span> by our team.
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed text-center">
                  We're constantly fine-tuning KeepRead.ing because we love the Word of God
                  and want to interact with it as deeply as possible.
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed text-center">
                  All suggestions welcome — and{" "}
                  <span className="font-semibold text-foreground/80">bugs reported here are fixed as soon as we know about them.</span>
                </p>

                {/* Heart SVG accent */}
                <div className="flex justify-center pt-1">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-primary/30">
                    <path
                      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                      fill="currentColor"
                    />
                  </svg>
                </div>

                <p className="text-[0.65rem] text-muted-foreground/60 text-center leading-relaxed">
                  Thank you for blessing this ministry. 🙏
                </p>
              </div>

              {/* ── Sign-in warning ── */}
              {!user && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  You'll need to sign in to submit.
                </p>
              )}
            </div>

            {/* ── Submit ── */}
            <div className="px-6 py-4 border-t border-border">
              <Button
                onClick={handleSubmit}
                disabled={!message.trim() || sending || !user}
                className="w-full gap-2"
                size="lg"
              >
                <Send className="h-4 w-4" />
                {sending ? "Sending…" : category === "bug" ? "Report Bug" : "Send Suggestion"}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
