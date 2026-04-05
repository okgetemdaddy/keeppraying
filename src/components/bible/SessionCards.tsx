import React from "react";
import { Clock, Play, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useStudySessions, type StudySession } from "@/hooks/useStudySessions";

// iPadOS: thumbnail_url generation → UIGraphicsImageRenderer snapshot of WKWebView canvas

const BOOK_ABBR: Record<string, string> = {
  GEN: "Gen", EXO: "Exo", LEV: "Lev", NUM: "Num", DEU: "Deu",
  JOS: "Jos", JDG: "Jdg", RUT: "Rut", "1SA": "1Sa", "2SA": "2Sa",
  PSA: "Psa", PRO: "Pro", ISA: "Isa", JER: "Jer", MAT: "Mat",
  MRK: "Mrk", LUK: "Luk", JHN: "Jhn", ACT: "Act", ROM: "Rom",
  REV: "Rev",
};

function formatElapsed(seconds: number): string {
  if (seconds < 60) return "<1 min";
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rm = mins % 60;
  return rm > 0 ? `${hrs}h ${rm}m` : `${hrs}h`;
}

interface SessionCardsProps {
  onResume: (session: StudySession) => void;
  onReview?: (session: StudySession) => void;
}

export function SessionCards({ onResume, onReview }: SessionCardsProps) {
  const { data: sessions, isLoading } = useStudySessions();
  const navigate = useNavigate();

  // Show all recent sessions (including completed) for discovery
  const recentSessions = sessions?.slice(0, 10) ?? [];

  if (isLoading) return null;

  // Empty state
  if (recentSessions.length === 0) {
    return (
      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
          Recent Sessions
        </h3>
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
          <BookOpen className="h-8 w-8 text-muted-foreground/30 mb-3" />
          <p className="text-xs text-muted-foreground leading-relaxed max-w-[240px]">
            Your study sessions will appear here as you read.
            Every highlight, note, and annotation is automatically
            tracked so you can revisit your journey later.
          </p>
        </div>
        <button
          onClick={() => navigate("/help#sessions")}
          className="text-[0.6rem] text-muted-foreground/60 hover:text-muted-foreground transition-colors underline underline-offset-2 decoration-border px-1"
        >
          What are sessions?
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
        Recent Sessions
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border">
        {recentSessions.map((s) => {
          const abbr = BOOK_ABBR[s.book_usfm] ?? s.book_usfm.slice(0, 3);
          const verseLabel = s.verse_start && s.verse_end
            ? `${abbr} ${s.chapter_id}:${s.verse_start}–${s.verse_end}`
            : `${abbr} ${s.chapter_id}`;

          const isCanvas = s.session_type === "canvas";
          const isActive = s.status !== "complete";
          const summary = s.session_summary as Record<string, unknown> | null;
          const studyArc = summary?.study_arc as string | undefined;

          return (
            <button
              key={s.id}
              onClick={() => onReview?.(s)}
              className="flex-shrink-0 w-40 h-[220px] rounded-2xl border border-border bg-card shadow-md hover:shadow-lg transition-shadow flex flex-col overflow-hidden group"
            >
              {/* Top: thumbnail placeholder */}
              <div className="flex-1 bg-gradient-to-b from-amber-50 to-amber-100/50 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center relative">
                <span className="text-2xl font-serif text-amber-700/40 dark:text-amber-400/30 select-none">
                  {abbr}
                </span>
                {isActive && s.status === "paused" && (
                  <span className="absolute top-2 right-2 text-[0.6rem] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 font-medium">
                    Paused
                  </span>
                )}
                {/* Session type badge */}
                <span className={`absolute top-2 left-2 text-[0.55rem] px-1.5 py-0.5 rounded-full font-medium ${
                  isCanvas
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                    : "bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/20"
                }`}>
                  {isCanvas ? "Canvas Study" : "Reading"}
                </span>
              </div>

              {/* Middle: verse range + summary */}
              <div className="px-3 py-2 text-left space-y-0.5">
                <p className="text-xs font-medium text-foreground truncate">{verseLabel}</p>
                {studyArc && (
                  <p className="text-[0.6rem] text-muted-foreground italic truncate leading-tight">
                    {studyArc}
                  </p>
                )}
              </div>

              {/* Bottom: elapsed + resume */}
              <div className="px-3 pb-2.5 flex items-center justify-between">
                <span className="flex items-center gap-1 text-[0.65rem] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatElapsed(s.elapsed_seconds)}
                </span>
                {isActive && (
                  <span
                    role="button"
                    onClick={(e) => { e.stopPropagation(); onResume(s); }}
                    className="flex items-center gap-0.5 text-[0.65rem] font-medium text-primary group-hover:underline hover:text-primary/80 transition-colors"
                  >
                    <Play className="h-2.5 w-2.5" />
                    Resume
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
      <button
        onClick={() => navigate("/support#sessions")}
        className="text-[0.6rem] text-muted-foreground/60 hover:text-muted-foreground transition-colors underline underline-offset-2 decoration-border px-1 mt-1"
      >
        What are sessions?
      </button>
    </section>
  );
}
