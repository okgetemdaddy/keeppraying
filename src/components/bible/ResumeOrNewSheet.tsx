import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StudySession } from "@/hooks/useStudySessions";

// iPadOS: ResumeOrNewSheet → UISheetPresentationController detent: .medium()
// Session thumbnail → UIImage(contentsOfFile:) from local cache or URLSession download.
// Camera restore → apply stored transform to WKWebView via evaluateJavaScript.
// Status update → Supabase Swift client: try await supabase.from("study_sessions").update(...)

const sheetSpring = { type: "spring" as const, damping: 30, stiffness: 300, mass: 0.8 };

/* ── USFM book name lookup (abbreviated) ── */
const BOOK_NAMES: Record<string, string> = {
  GEN: "Genesis", EXO: "Exodus", LEV: "Leviticus", NUM: "Numbers", DEU: "Deuteronomy",
  JOS: "Joshua", JDG: "Judges", RUT: "Ruth", "1SA": "1 Samuel", "2SA": "2 Samuel",
  "1KI": "1 Kings", "2KI": "2 Kings", "1CH": "1 Chronicles", "2CH": "2 Chronicles",
  EZR: "Ezra", NEH: "Nehemiah", EST: "Esther", JOB: "Job", PSA: "Psalms",
  PRO: "Proverbs", ECC: "Ecclesiastes", SNG: "Song of Solomon", ISA: "Isaiah",
  JER: "Jeremiah", LAM: "Lamentations", EZK: "Ezekiel", DAN: "Daniel",
  HOS: "Hosea", JOL: "Joel", AMO: "Amos", OBA: "Obadiah", JON: "Jonah",
  MIC: "Micah", NAM: "Nahum", HAB: "Habakkuk", ZEP: "Zephaniah", HAG: "Haggai",
  ZEC: "Zechariah", MAL: "Malachi",
  MAT: "Matthew", MRK: "Mark", LUK: "Luke", JHN: "John", ACT: "Acts",
  ROM: "Romans", "1CO": "1 Corinthians", "2CO": "2 Corinthians", GAL: "Galatians",
  EPH: "Ephesians", PHP: "Philippians", COL: "Colossians",
  "1TH": "1 Thessalonians", "2TH": "2 Thessalonians",
  "1TI": "1 Timothy", "2TI": "2 Timothy", TIT: "Titus", PHM: "Philemon",
  HEB: "Hebrews", JAS: "James", "1PE": "1 Peter", "2PE": "2 Peter",
  "1JN": "1 John", "2JN": "2 John", "3JN": "3 John", JUD: "Jude", REV: "Revelation",
};

function getBookName(usfm: string): string {
  return BOOK_NAMES[usfm] ?? usfm;
}

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m} min`;
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

/* ── Dot-grid placeholder thumbnail ── */
function DotGridPlaceholder({ bookUsfm }: { bookUsfm: string }) {
  const abbr = bookUsfm.slice(0, 3);
  return (
    <div className="w-[60px] h-[80px] rounded-lg bg-muted flex items-center justify-center relative overflow-hidden shrink-0">
      {/* Dot grid pattern */}
      <svg width="60" height="80" className="absolute inset-0 opacity-20">
        {Array.from({ length: 6 }).map((_, row) =>
          Array.from({ length: 4 }).map((_, col) => (
            <circle
              key={`${row}-${col}`}
              cx={10 + col * 14}
              cy={10 + row * 14}
              r="1"
              fill="currentColor"
              className="text-foreground"
            />
          ))
        )}
      </svg>
      <span className="text-xs font-semibold text-muted-foreground z-10">{abbr}</span>
    </div>
  );
}

interface ResumeOrNewSheetProps {
  open: boolean;
  session: StudySession;
  onResume: () => void;
  onStartNew: () => void;
  onClose: () => void;
}

export function ResumeOrNewSheet({ open, session, onResume, onStartNew, onClose }: ResumeOrNewSheetProps) {
  if (!open) return null;

  const bookName = getBookName(session.book_usfm);
  const verseRange = session.verse_start && session.verse_end
    ? `vv. ${session.verse_start}–${session.verse_end}`
    : session.verse_start
      ? `v. ${session.verse_start}`
      : null;

  const statusColor = session.status === "active"
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
    : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop — NOT dismissible */}
          <motion.div
            key="resume-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div
            key="resume-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={sheetSpring}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[50vh] overflow-y-auto rounded-t-3xl bg-card border-t border-border shadow-2xl"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            <div className="px-6 pb-8 space-y-4">
              {/* Section label */}
              <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">
                iPad Mode Session
              </span>

              {/* Session card */}
              <div className="flex gap-4 p-4 rounded-2xl border border-border bg-muted/30">
                {/* Thumbnail */}
                {session.thumbnail_url ? (
                  <img
                    src={session.thumbnail_url}
                    alt={`${bookName} ${session.chapter_id}`}
                    className="w-[60px] h-[80px] rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <DotGridPlaceholder bookUsfm={session.book_usfm} />
                )}

                {/* Info */}
                <div className="flex flex-col justify-center gap-1 min-w-0">
                  <span className="text-sm font-medium text-foreground truncate">
                    {bookName} {session.chapter_id}
                  </span>
                  {verseRange && (
                    <span className="text-[13px] text-muted-foreground">{verseRange}</span>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 shrink-0" />
                    <span>{formatElapsed(session.elapsed_seconds)}</span>
                    <span>·</span>
                    <span>{formatRelativeTime(session.last_active_at)}</span>
                  </div>
                  <span className={`inline-flex self-start rounded-full px-2 py-0.5 text-xs font-medium ${statusColor}`}>
                    {session.status}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <Button
                  className="flex-1 h-11 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-medium"
                  onClick={onResume}
                >
                  ✦ Resume
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 h-11 rounded-xl font-medium"
                  onClick={onStartNew}
                >
                  Start New
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
