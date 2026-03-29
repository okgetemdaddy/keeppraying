import React, { useState } from "react";
import { motion } from "framer-motion";
import { Package, X, Check, LogIn, Sparkles, Plus, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import type { BunchWithCount } from "@/components/bible/VerseBunchStrip";

/* ── localStorage / sessionStorage keys ── */
const LS_AWARE_KEY = "bible_bunch_aware";
const SS_PENDING_KEY = "pending_verse_bunch";

export function isBunchAware(): boolean {
  try { return localStorage.getItem(LS_AWARE_KEY) === "true"; } catch { return false; }
}

export function setBunchAware(): void {
  try { localStorage.setItem(LS_AWARE_KEY, "true"); } catch {}
}

export interface PendingVerseBunch {
  versionId: number;
  bookUsfm: string;
  chapterNumber: string;
  verseNumbers: number[];
  returnPath: string;
}

export function savePendingBunch(data: PendingVerseBunch): void {
  try { sessionStorage.setItem(SS_PENDING_KEY, JSON.stringify(data)); } catch {}
}

export function loadPendingBunch(): PendingVerseBunch | null {
  try {
    const raw = sessionStorage.getItem(SS_PENDING_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingVerseBunch;
  } catch { return null; }
}

export function clearPendingBunch(): void {
  try { sessionStorage.removeItem(SS_PENDING_KEY); } catch {}
}

/* ── Tooltip component ── */

type TooltipStep = "awareness" | "signin" | "form";

export interface VerseBunchTooltipProps {
  selectedVerses: number[];
  bookTitle: string;
  chapterTitle: string;
  /** Full scripture ref info needed for pending bunch */
  versionId: number;
  bookUsfm: string;
  chapterNumber: string;
  /** Whether user is signed in */
  isAuthenticated: boolean;
  /** Called when user creates a bunch (name, description) */
  onConfirm: (bunchName: string, description?: string) => void;
  /** Called to close/dismiss */
  onDismiss: () => void;
  /** Initial step override — if user already acknowledged, start at form */
  initialStep?: TooltipStep;
}

export function VerseBunchTooltip({
  selectedVerses,
  bookTitle,
  chapterTitle,
  versionId,
  bookUsfm,
  chapterNumber,
  isAuthenticated,
  onConfirm,
  onDismiss,
  initialStep = "awareness",
}: VerseBunchTooltipProps) {
  const [step, setStep] = useState<TooltipStep>(initialStep);
  const [bunchName, setBunchName] = useState("");
  const [description, setDescription] = useState("");
  const navigate = useNavigate();

  const verseRange =
    selectedVerses.length === 1
      ? `verse ${selectedVerses[0]}`
      : `verses ${selectedVerses[0]}–${selectedVerses[selectedVerses.length - 1]}`;

  const handleTryCreating = () => {
    setBunchAware();
    if (isAuthenticated) {
      setStep("form");
    } else {
      setStep("signin");
    }
  };

  const handleNice = () => {
    setBunchAware();
    onDismiss();
  };

  const handleSignIn = () => {
    // Save pending bunch to sessionStorage
    savePendingBunch({
      versionId,
      bookUsfm,
      chapterNumber,
      verseNumbers: selectedVerses,
      returnPath: "/bible",
    });
    navigate("/auth?returnTo=/bible");
  };

  /* ── AWARENESS step ── */
  if (step === "awareness") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl sm:left-1/2 sm:right-auto sm:w-[92vw] sm:-translate-x-1/2 sm:bottom-6 sm:inset-x-auto"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300">
            <Package className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-foreground">
              ✨ Verse Bunches
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              You've selected {selectedVerses.length} verses! Did you know you can
              bundle verses from <strong>anywhere in the Bible</strong> into a
              "Verse Bunch"? Use them in Circles, Family Rooms, or for personal
              study and prayer.
            </p>
          </div>
          <button
            onClick={onDismiss}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNice}
            className="text-muted-foreground"
          >
            Nice.
          </Button>
          <Button size="sm" onClick={handleTryCreating} className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Try Creating a Verse Bunch Now
          </Button>
        </div>
      </motion.div>
    );
  }

  /* ── SIGNIN step ── */
  if (step === "signin") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl sm:left-1/2 sm:right-auto sm:w-[92vw] sm:-translate-x-1/2 sm:bottom-6 sm:inset-x-auto"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <LogIn className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-foreground">
              Sign in to save your Verse Bunch
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Your {selectedVerses.length} selected verses ({bookTitle} {chapterTitle}:{verseRange}) will
              be waiting for you. Plus, unlock highlights, notes, prayer boards,
              streak tracking, and so much more.
            </p>
          </div>
          <button
            onClick={onDismiss}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            Maybe later
          </Button>
          <Button size="sm" onClick={handleSignIn} className="gap-1.5">
            <LogIn className="h-3.5 w-3.5" />
            Sign in
          </Button>
        </div>
      </motion.div>
    );
  }

  /* ── FORM step ── */
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl sm:left-1/2 sm:right-auto sm:w-[92vw] sm:-translate-x-1/2 sm:bottom-6 sm:inset-x-auto"
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
