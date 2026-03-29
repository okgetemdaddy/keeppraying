import React, { useState } from "react";
import { motion } from "framer-motion";
import { Package, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const LS_KEY = "bible_bunch_dialog_dismissed";

export function isBunchDialogDismissed(): boolean {
  try {
    return localStorage.getItem(LS_KEY) === "true";
  } catch {
    return false;
  }
}

export function dismissBunchDialog(): void {
  try {
    localStorage.setItem(LS_KEY, "true");
  } catch {}
}

export interface VerseBunchDialogProps {
  selectedVerses: number[];
  bookTitle: string;
  chapterTitle: string;
  onConfirm: (bunchName: string, description?: string) => void;
  onDismiss: () => void;
  onDontShowAgain: () => void;
}

export function VerseBunchDialog({
  selectedVerses,
  bookTitle,
  chapterTitle,
  onConfirm,
  onDismiss,
  onDontShowAgain,
}: VerseBunchDialogProps) {
  const [step, setStep] = useState<"prompt" | "form">("prompt");
  const [bunchName, setBunchName] = useState("");
  const [description, setDescription] = useState("");

  const verseRange =
    selectedVerses.length === 1
      ? `verse ${selectedVerses[0]}`
      : `verses ${selectedVerses[0]}–${selectedVerses[selectedVerses.length - 1]}`;

  if (step === "prompt") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="fixed bottom-6 left-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 rounded-2xl border border-border bg-card p-5 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300">
            <Package className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-foreground">
              Create a Verse Bunch?
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              You've selected {selectedVerses.length} verses ({bookTitle} {chapterTitle}:{verseRange}).
              Would you like to bundle them into a "Verse Bunch" you can
              reference in prayer later?
            </p>
          </div>
          <button
            onClick={onDismiss}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={() => {
              dismissBunchDialog();
              onDontShowAgain();
            }}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
          >
            Don't show again
          </button>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              No thanks
            </Button>
            <Button size="sm" onClick={() => setStep("form")}>
              Yes, create
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Form step
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="fixed bottom-6 left-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 rounded-2xl border border-border bg-card p-5 shadow-2xl"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300">
          <Package className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">
          Name your Verse Bunch
        </h3>
      </div>

      <div className="space-y-3">
        <Input
          value={bunchName}
          onChange={(e) => setBunchName(e.target.value)}
          placeholder="e.g., Family Prayer, Healing Promises…"
          maxLength={100}
          autoFocus
        />
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description…"
          maxLength={500}
          className="min-h-[60px] resize-none text-sm"
        />
        <p className="text-xs text-muted-foreground">
          {bookTitle} {chapterTitle}:{verseRange} · {selectedVerses.length} verse{selectedVerses.length > 1 ? "s" : ""}
        </p>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          Cancel
        </Button>
        <Button
          size="sm"
          disabled={!bunchName.trim()}
          onClick={() => {
            if (bunchName.trim()) {
              onConfirm(bunchName.trim(), description.trim() || undefined);
            }
          }}
        >
          <Check className="mr-1 h-3.5 w-3.5" />
          Create Bunch
        </Button>
      </div>
    </motion.div>
  );
}
