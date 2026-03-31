import React, { useState } from "react";
import { Send, Heart } from "lucide-react";
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

export function BibleSuggestionSheet({ open, onClose }: BibleSuggestionSheetProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) return;
    if (!user) {
      toast.error("Please sign in to submit a suggestion.");
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.from("feedback_submissions").insert({
        user_id: user.id,
        feedback_type: "bible_suggestion",
        title: title.trim() || null,
        message: message.trim(),
      });

      if (error) throw error;

      setSent(true);
      // Auto-close after showing thanks
      setTimeout(() => {
        setSent(false);
        setTitle("");
        setMessage("");
        onClose();
      }, 2500);
    } catch (err: any) {
      toast.error("Could not send — please try again.");
      console.error("Suggestion submit error:", err);
    } finally {
      setSending(false);
    }
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) {
      setSent(false);
      setTitle("");
      setMessage("");
      onClose();
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto pb-8 px-5">
        {sent ? (
          /* ── Thank-you state ── */
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Heart className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-foreground">
              God bless you 🙏
            </h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-xs leading-relaxed">
              Thank you for blessing KeepPray.ing with your idea. Your heart for this ministry means the world to us.
            </p>
          </div>
        ) : (
          <>
            <SheetHeader className="text-left">
              <SheetTitle className="text-lg font-bold tracking-tight">
                Make a Suggestion 💡
              </SheetTitle>
              <SheetDescription className="text-sm text-muted-foreground leading-relaxed">
                Thank you for blessing us by helping us improve God's Word reader.
                Every suggestion is read prayerfully by our team.
              </SheetDescription>
            </SheetHeader>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Title <span className="text-muted-foreground/60">(optional)</span>
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Split-screen translations"
                  maxLength={120}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Your suggestion <span className="text-destructive">*</span>
                </label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us what you'd love to see in the Bible reader…"
                  className="min-h-[100px] resize-none"
                  maxLength={2000}
                />
              </div>
            </div>

            {!user && (
              <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
                You'll need to sign in to submit a suggestion.
              </p>
            )}

            <Button
              onClick={handleSubmit}
              disabled={!message.trim() || sending || !user}
              className="mt-5 w-full gap-2"
              size="lg"
            >
              <Send className="h-4 w-4" />
              {sending ? "Sending…" : "Send Suggestion"}
            </Button>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
