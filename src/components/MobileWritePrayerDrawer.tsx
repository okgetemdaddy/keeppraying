import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAutoRegion } from "@/hooks/useAutoRegion";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Bold, Italic, Underline, Strikethrough, Loader2, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type Phase = "idle" | "composing" | "submitted";

interface MobileWritePrayerDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (prayerId?: string) => void;
}

export default function MobileWritePrayerDrawer({
  open,
  onOpenChange,
  onSuccess,
}: MobileWritePrayerDrawerProps) {
  const { user } = useAuth();
  const { region: userRegion } = useAutoRegion();
  const [phase, setPhase] = useState<Phase>("idle");
  const [submitting, setSubmitting] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  const resetState = useCallback(() => {
    setPhase("idle");
    setSubmitting(false);
  }, []);

  const handleClose = useCallback((v: boolean) => {
    if (!v) {
      // small delay so drawer animation finishes before resetting
      setTimeout(resetState, 300);
    }
    onOpenChange(v);
  }, [onOpenChange, resetState]);

  const execFormat = (cmd: string) => {
    document.execCommand(cmd, false);
    editorRef.current?.focus();
  };

  const handleSubmit = async () => {
    if (!user) return;
    const html = editorRef.current?.innerHTML?.trim() || "";
    // Strip tags for plain-text length check
    const plainText = editorRef.current?.innerText?.trim() || "";
    if (plainText.length < 10) return;

    setSubmitting(true);
    try {
      const { data: card, error } = await supabase.from("prayer_cards").insert({
        prayer_text: html,
        text_style: "classic",
        labels: [],
        status: "private",
        created_by: user.id,
        region: userRegion || null,
      }).select("id").single();

      if (error) throw error;

      if (card?.id) {
        await supabase.from("user_saved_prayers").insert({
          user_id: user.id,
          prayer_id: card.id,
          position: 0,
        });
      }

      setPhase("submitted");
      onSuccess?.(card?.id);
    } catch {
      // silently fail — user can retry
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Phase 2: Fullscreen Composer ── */
  if (phase === "composing") {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[60] flex flex-col"
          style={{ background: "hsl(42 55% 99%)" }}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 pt-[env(safe-area-inset-top,12px)] pb-2">
            <button
              onClick={() => setPhase("idle")}
              className="text-sm font-medium px-3 py-1.5 rounded-xl"
              style={{ color: "hsl(25 18% 46%)" }}
            >
              ← Back
            </button>
            <span
              className="text-sm font-display font-semibold"
              style={{ color: "hsl(25 35% 14%)" }}
            >
              Write a Prayer
            </span>
            <div className="w-14" /> {/* spacer */}
          </div>

          {/* Formatting Toolbar */}
          <div
            className="flex items-center gap-1 px-4 py-2 mx-4 rounded-xl"
            style={{
              background: "hsl(38 50% 96%)",
              border: "1px solid hsl(38 22% 90%)",
            }}
          >
            {[
              { cmd: "bold", Icon: Bold, label: "Bold" },
              { cmd: "italic", Icon: Italic, label: "Italic" },
              { cmd: "underline", Icon: Underline, label: "Underline" },
              { cmd: "strikeThrough", Icon: Strikethrough, label: "Strikethrough" },
            ].map(({ cmd, Icon, label }) => (
              <button
                key={cmd}
                type="button"
                aria-label={label}
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent blur
                  execFormat(cmd);
                }}
                className="flex items-center justify-center w-10 h-10 rounded-lg transition-colors active:bg-black/10"
                style={{ color: "hsl(25 30% 28%)" }}
              >
                <Icon className="w-[18px] h-[18px]" />
              </button>
            ))}
          </div>

          {/* Editable area — fills remaining space */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              data-placeholder="Lord, I come before you today…"
              className={cn(
                "w-full min-h-full outline-none text-lg leading-[1.9] font-display",
                "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/50 empty:before:pointer-events-none"
              )}
              style={{ color: "hsl(25 30% 18%)" }}
              // auto-focus when entering composing mode
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.metaKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
          </div>

          {/* Submit button — pinned at bottom */}
          <div
            className="px-4 pb-[max(env(safe-area-inset-bottom,12px),12px)] pt-2"
            style={{ borderTop: "1px solid hsl(38 22% 92%)" }}
          >
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className={cn(
                "w-full h-12 rounded-2xl font-semibold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98]",
                submitting ? "opacity-70" : ""
              )}
              style={{
                background: "linear-gradient(145deg, hsl(42 85% 52%), hsl(35 82% 44%))",
                color: "hsl(25 35% 10%)",
                boxShadow: "0 4px 16px -4px hsl(42 85% 46% / 0.4)",
              }}
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              ) : (
                "Submit Prayer"
              )}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  /* ── Phase 1 (idle) & Phase 3 (submitted): Drawer ── */
  return (
    <Drawer
      open={open}
      onOpenChange={handleClose}
    >
      <DrawerContent className="max-h-[85vh] px-4 pb-6">
        {phase === "idle" && (
          <div className="pt-4 pb-2 space-y-5">
            <div className="text-center">
              <h2
                className="font-display text-2xl font-bold"
                style={{ color: "hsl(25 35% 14%)" }}
              >
                Write a Prayer
              </h2>
              <p className="text-sm mt-1" style={{ color: "hsl(25 18% 52%)" }}>
                Pour your heart out to God
              </p>
            </div>

            {/* Tappable placeholder that transitions to fullscreen */}
            <button
              type="button"
              onClick={() => {
                setPhase("composing");
                // Focus the editor after a tick
                requestAnimationFrame(() => {
                  requestAnimationFrame(() => {
                    editorRef.current?.focus();
                  });
                });
              }}
              className="w-full text-left rounded-2xl transition-shadow"
              style={{
                minHeight: 140,
                padding: "1.25rem",
                background: "hsl(38 55% 99%)",
                boxShadow: "inset 0 2px 12px hsl(42 75% 46% / 0.07), 0 0 0 1.5px hsl(38 22% 88%)",
                color: "hsl(25 18% 56%)",
              }}
            >
              <span className="text-base font-display italic">
                Tap here to begin writing your prayer…
              </span>
            </button>
          </div>
        )}

        {phase === "submitted" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35 }}
            className="pt-6 pb-4 flex flex-col items-center text-center space-y-4"
            onClick={() => handleClose(false)}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{
                background: "linear-gradient(145deg, hsl(42 85% 52%), hsl(35 82% 44%))",
                boxShadow: "0 4px 20px -4px hsl(42 85% 46% / 0.4)",
              }}
            >
              <Heart className="w-7 h-7 text-white fill-white" />
            </div>

            <div className="space-y-2 max-w-[280px]">
              <h3
                className="font-display text-xl font-bold"
                style={{ color: "hsl(25 35% 14%)" }}
              >
                Thank you — God bless you
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "hsl(25 18% 46%)" }}
              >
                He hears every prayer. Consider making it public to edify others.
              </p>
              <p
                className="text-sm font-semibold italic font-display"
                style={{ color: "hsl(42 75% 40%)" }}
              >
                We are praying for you! 🙏
              </p>
            </div>

            <p className="text-xs mt-4" style={{ color: "hsl(25 18% 64%)" }}>
              Tap anywhere to dismiss
            </p>
          </motion.div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
