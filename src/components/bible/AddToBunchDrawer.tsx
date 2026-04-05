import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, X } from "lucide-react";
import {
  ResponsiveSheet as Sheet,
  ResponsiveSheetContent as SheetContent,
  ResponsiveSheetHeader as SheetHeader,
  ResponsiveSheetTitle as SheetTitle,
} from "@/components/ui/responsive-sheet";
import { getBunchColor, BUNCH_COLOR_CLASSES } from "@/components/bible/bunchColors";
import type { BunchWithCount } from "@/components/bible/VerseBunchStrip";

interface AddToBunchDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bunches: BunchWithCount[];
  onSelect: (bunchId: string, bunchName: string) => void;
}

export function AddToBunchDrawer({ open, onOpenChange, bunches, onSelect }: AddToBunchDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-8 px-6 max-w-md mx-auto">
        <SheetHeader className="relative">
          <SheetTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            Add to a Bunch
          </SheetTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-0 top-0 h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </SheetHeader>
        <div className="mt-4 space-y-2 max-h-[50vh] overflow-y-auto">
          {bunches.length === 0 ? (
            <p className="text-sm text-muted-foreground italic text-center py-4">
              No verse bunches yet. Select 2+ verses to create one.
            </p>
          ) : (
            bunches.map((b, idx) => {
              const color = getBunchColor(idx);
              const classes = BUNCH_COLOR_CLASSES[color];
              return (
                <button
                  key={b.id}
                  onClick={() => onSelect(b.id, b.bunch_name)}
                  className={`flex items-center gap-3 w-full text-left rounded-lg border ${classes.pill} px-4 py-3 hover:opacity-80 transition-colors opacity-90`}
                >
                  <Package className={`h-4 w-4 shrink-0 ${classes.pillText}`} />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold ${classes.pillText} truncate`}>{b.bunch_name}</p>
                    <p className="text-[0.6rem] text-muted-foreground">{b.item_count} verse{b.item_count !== 1 ? "s" : ""}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ── Floating "Verse Added" toast ── */
export function VerseAddedToast({ bunchName, visible }: { bunchName: string; visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.35 }}
          className="fixed bottom-20 left-1/2 z-[60] -translate-x-1/2 rounded-xl border border-border bg-card px-5 py-3 shadow-xl"
        >
          <p className="text-sm text-foreground font-medium flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            Verse Added to <span className="text-primary">{bunchName}</span>
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
