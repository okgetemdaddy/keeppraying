import React from "react";
import { Clock, Play } from "lucide-react";
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

  const activeSessions = sessions?.filter((s) => s.status !== "complete") ?? [];

  if (isLoading || activeSessions.length === 0) return null;

  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
        Recent Sessions
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border">
        {activeSessions.map((s) => {
          const abbr = BOOK_ABBR[s.book_usfm] ?? s.book_usfm.slice(0, 3);
          const verseLabel = s.verse_start && s.verse_end
            ? `${abbr} ${s.chapter_id}:${s.verse_start}–${s.verse_end}`
            : `${abbr} ${s.chapter_id}`;

          return (
            <button
              key={s.id}
              onClick={() => onResume(s)}
              className="flex-shrink-0 w-40 h-[200px] rounded-2xl border border-border bg-card shadow-md hover:shadow-lg transition-shadow flex flex-col overflow-hidden group"
            >
              {/* Top: thumbnail placeholder */}
              <div className="flex-1 bg-gradient-to-b from-amber-50 to-amber-100/50 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center relative">
                <span className="text-2xl font-serif text-amber-700/40 dark:text-amber-400/30 select-none">
                  {abbr}
                </span>
                {s.status === "paused" && (
                  <span className="absolute top-2 right-2 text-[0.6rem] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 font-medium">
                    Paused
                  </span>
                )}
              </div>

              {/* Middle: verse range */}
              <div className="px-3 py-2 text-left">
                <p className="text-xs font-medium text-foreground truncate">{verseLabel}</p>
              </div>

              {/* Bottom: elapsed + resume */}
              <div className="px-3 pb-2.5 flex items-center justify-between">
                <span className="flex items-center gap-1 text-[0.65rem] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatElapsed(s.elapsed_seconds)}
                </span>
                <span className="flex items-center gap-0.5 text-[0.65rem] font-medium text-primary group-hover:underline">
                  <Play className="h-2.5 w-2.5" />
                  Resume
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
