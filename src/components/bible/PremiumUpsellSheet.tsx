import React, { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// iPadOS: PremiumUpsellSheet → SKStoreProductViewController or StoreKit 2 paywall.
// Product.products(for: ["com.keepreading.premium.monthly"]) async.
// CTA → product.purchase() with Transaction.updates AsyncSequence listener.
// Ink animation → CAShapeLayer with strokeEnd animated via CABasicAnimation.

const sheetSpring = { type: "spring" as const, damping: 30, stiffness: 300, mass: 0.8 };

/* ── Animated ink stroke SVG ── */
function InkStrokeAnimation() {
  const pathRef = useRef<SVGPathElement>(null);
  const [length, setLength] = useState(0);

  useEffect(() => {
    if (pathRef.current) {
      const l = pathRef.current.getTotalLength();
      setLength(l);
    }
  }, []);

  return (
    <svg viewBox="0 0 280 80" className="w-full max-w-[280px] h-20 mx-auto">
      <rect x="0" y="0" width="280" height="80" rx="8" fill="hsl(var(--muted))" />
      <path
        ref={pathRef}
        d="M 20 55 C 60 20, 100 60, 140 40 S 220 20, 260 45"
        stroke="hsl(28 80% 30%)"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        style={{
          strokeDasharray: length || 300,
          strokeDashoffset: length || 300,
          animation: length ? "inkDraw 1.2s ease-out forwards" : "none",
        }}
      />
      <style>{`
        @keyframes inkDraw {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </svg>
  );
}

/* ── Diamond bullet ── */
function DiamondBullet() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" className="shrink-0 mt-0.5">
      <polygon points="8,0 16,8 8,16 0,8" fill="hsl(38 92% 50%)" />
    </svg>
  );
}

interface PremiumUpsellSheetProps {
  open: boolean;
  onClose: () => void;
}

export function PremiumUpsellSheet({ open, onClose }: PremiumUpsellSheetProps) {
  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop — NOT dismissible */}
          <motion.div
            key="premium-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div
            key="premium-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={sheetSpring}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-card border-t border-border shadow-2xl"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            <div className="px-6 pb-8 space-y-5">
              {/* Animated ink stroke */}
              <InkStrokeAnimation />

              {/* Headline */}
              <h2 className="text-xl font-medium text-center text-foreground">
                Study deeper.
              </h2>

              {/* Sub-headline */}
              <p className="text-sm text-center text-muted-foreground max-w-[300px] mx-auto leading-relaxed">
                Canvas study mode is a KeepRead.ing Premium feature. Apple Pencil
                annotation, cross-reference insights, and timed sessions — built for
                serious students of the Word.
              </p>

              {/* Feature list */}
              <div className="space-y-3 py-2">
                {[
                  "Apple Pencil annotation with pressure & tilt",
                  "Circle-to-study cross-reference insights",
                  "Timed sessions with study history",
                ].map((text) => (
                  <div key={text} className="flex items-start gap-3">
                    <DiamondBullet />
                    <span className="text-sm text-foreground leading-snug">{text}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <Button
                className="w-full h-12 rounded-xl text-base font-medium bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => {
                  toast("Coming soon ✦", {
                    description: "Premium subscriptions are launching soon. Stay tuned!",
                  });
                }}
              >
                Unlock Premium
              </Button>

              {/* Ghost dismiss */}
              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={onClose}
              >
                Maybe later
              </Button>

              {/* Fine print */}
              <p className="text-[11px] text-center text-muted-foreground/60">
                Restores on all your devices. Cancel anytime.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
