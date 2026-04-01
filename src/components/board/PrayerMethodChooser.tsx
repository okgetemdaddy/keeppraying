import { motion } from "framer-motion";
import { Mic, PenLine } from "lucide-react";
import { ResponsiveDialog as Dialog, ResponsiveDialogContent as DialogContent } from "@/components/ui/responsive-dialog";

interface PrayerMethodChooserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSpeak: () => void;
  onWrite: () => void;
}

export function PrayerMethodChooser({ open, onOpenChange, onSpeak, onWrite }: PrayerMethodChooserProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-full border-0 shadow-2xl p-0 overflow-hidden"
        style={{
          maxWidth: "min(28rem, 92vw)",
          background: "hsl(42 55% 99%)",
          boxShadow: "0 32px 80px -16px rgba(0,0,0,0.22), 0 0 0 1px hsl(38 22% 90%)",
        }}
      >
        {/* Header */}
        <div className="text-center pt-8 pb-4 px-6">
          <h2 className="font-display text-2xl font-bold" style={{ color: "hsl(25 35% 14%)" }}>
            Add a Prayer
          </h2>
          <p className="text-sm mt-1" style={{ color: "hsl(25 18% 52%)" }}>
            How would you like to pray?
          </p>
        </div>

        {/* Two option cards */}
        <div className="px-6 pb-8 flex flex-col sm:flex-row gap-4">
          {/* Speak It */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => { onOpenChange(false); onSpeak(); }}
            className="flex-1 rounded-2xl p-6 flex flex-col items-center gap-3 transition-colors group"
            style={{
              background: "linear-gradient(145deg, hsl(42 65% 96%), hsl(38 55% 93%))",
              boxShadow: "0 4px 20px -4px hsl(42 75% 46% / 0.15), inset 0 1px 0 hsl(42 80% 98%)",
              border: "1.5px solid hsl(38 22% 88%)",
            }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110"
              style={{
                background: "linear-gradient(145deg, hsl(42 85% 52%), hsl(35 82% 44%))",
                boxShadow: "0 4px 14px -4px hsl(42 85% 46% / 0.5)",
              }}
            >
              <Mic className="w-7 h-7 text-white" />
            </div>
            <div className="text-center">
              <p className="font-display text-lg font-bold" style={{ color: "hsl(25 35% 14%)" }}>
                Speak It
              </p>
              <p className="text-xs mt-0.5" style={{ color: "hsl(25 18% 52%)" }}>
                Record your prayer aloud
              </p>
            </div>
          </motion.button>

          {/* Write It */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => { onOpenChange(false); onWrite(); }}
            className="flex-1 rounded-2xl p-6 flex flex-col items-center gap-3 transition-colors group"
            style={{
              background: "linear-gradient(145deg, hsl(42 65% 96%), hsl(38 55% 93%))",
              boxShadow: "0 4px 20px -4px hsl(42 75% 46% / 0.15), inset 0 1px 0 hsl(42 80% 98%)",
              border: "1.5px solid hsl(38 22% 88%)",
            }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110"
              style={{
                background: "linear-gradient(145deg, hsl(150 38% 30%), hsl(150 38% 24%))",
                boxShadow: "0 4px 14px -4px hsl(150 38% 26% / 0.5)",
              }}
            >
              <PenLine className="w-7 h-7 text-white" />
            </div>
            <div className="text-center">
              <p className="font-display text-lg font-bold" style={{ color: "hsl(25 35% 14%)" }}>
                Write It
              </p>
              <p className="text-xs mt-0.5" style={{ color: "hsl(25 18% 52%)" }}>
                Type your prayer in a journal
              </p>
            </div>
          </motion.button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
