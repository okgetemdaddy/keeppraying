// iPadOS: Maps to UISheetPresentationController with .large() detent and UIBlurEffect.Style.systemUltraThinMaterial
import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Highlighter,
  StickyNote,
  PenTool,
  Link2,
  BookmarkCheck,
  Eye,
  Navigation,
  Play,
  Pause,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import type { StudySession } from "@/hooks/useStudySessions";
import type { SessionEvent, SessionEventType } from "@/hooks/useSessionTelemetry";

/* ── Types ── */
interface SessionSummary {
  thematic_summary: string;
  key_insights: string[];
  study_arc: string;
  tags: string[];
  time_breakdown: {
    reading_pct: number;
    annotating_pct: number;
    cross_referencing_pct: number;
  };
  verse_focus: string[];
}

interface SessionReviewDrawerProps {
  open: boolean;
  onClose: () => void;
  session: StudySession;
  events: SessionEvent[];
  onGenerateSummary?: () => void;
  summaryLoading?: boolean;
}

/* ── Event icon map ── */
const EVENT_ICONS: Record<SessionEventType, React.ReactNode> = {
  verse_view: <Eye className="h-3.5 w-3.5" />,
  highlight_added: <Highlighter className="h-3.5 w-3.5" />,
  highlight_removed: <Highlighter className="h-3.5 w-3.5 opacity-40" />,
  note_written: <StickyNote className="h-3.5 w-3.5" />,
  note_edited: <StickyNote className="h-3.5 w-3.5" />,
  ink_stroke: <PenTool className="h-3.5 w-3.5" />,
  ink_erased: <PenTool className="h-3.5 w-3.5 opacity-40" />,
  circle_select: <Navigation className="h-3.5 w-3.5" />,
  cross_ref_nav: <Link2 className="h-3.5 w-3.5" />,
  chapter_nav: <Navigation className="h-3.5 w-3.5" />,
  bookmark_added: <BookmarkCheck className="h-3.5 w-3.5" />,
  bookmark_removed: <BookmarkCheck className="h-3.5 w-3.5 opacity-40" />,
  session_start: <Play className="h-3.5 w-3.5" />,
  session_end: <Pause className="h-3.5 w-3.5" />,
};

const EVENT_LABELS: Record<SessionEventType, string> = {
  verse_view: "Viewed",
  highlight_added: "Highlighted",
  highlight_removed: "Removed highlight",
  note_written: "Wrote note",
  note_edited: "Edited note",
  ink_stroke: "Ink stroke",
  ink_erased: "Erased ink",
  circle_select: "Circle select",
  cross_ref_nav: "Cross reference",
  chapter_nav: "Chapter nav",
  bookmark_added: "Bookmarked",
  bookmark_removed: "Removed bookmark",
  session_start: "Session started",
  session_end: "Session ended",
};

/* ── Cluster events within 2 min ── */
interface EventCluster {
  events: SessionEvent[];
  label: string;
  icon: React.ReactNode;
  timestamp: string;
  isExpanded?: boolean;
}

function clusterEvents(events: SessionEvent[]): EventCluster[] {
  if (events.length === 0) return [];
  const clusters: EventCluster[] = [];
  let current: SessionEvent[] = [events[0]];

  for (let i = 1; i < events.length; i++) {
    const prev = new Date(events[i - 1].created_at).getTime();
    const curr = new Date(events[i].created_at).getTime();
    const sameType = events[i].event_type === current[0].event_type;

    if (sameType && curr - prev < 120_000) {
      current.push(events[i]);
    } else {
      clusters.push(buildCluster(current));
      current = [events[i]];
    }
  }
  clusters.push(buildCluster(current));
  return clusters;
}

function buildCluster(events: SessionEvent[]): EventCluster {
  const type = events[0].event_type as SessionEventType;
  const label =
    events.length > 1
      ? `${events.length} ${EVENT_LABELS[type].toLowerCase()}s`
      : EVENT_LABELS[type];
  return {
    events,
    label,
    icon: EVENT_ICONS[type],
    timestamp: events[0].created_at,
  };
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatElapsed(seconds: number): string {
  if (seconds < 60) return "<1 min";
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rm = mins % 60;
  return rm > 0 ? `${hrs}h ${rm}m` : `${hrs}h`;
}

/* ── Donut chart (pure SVG) ── */
function DonutChart({
  reading,
  annotating,
  crossRef,
}: {
  reading: number;
  annotating: number;
  crossRef: number;
}) {
  const total = reading + annotating + crossRef || 1;
  const r = 40;
  const c = 2 * Math.PI * r;
  const seg1 = (reading / total) * c;
  const seg2 = (annotating / total) * c;
  const seg3 = (crossRef / total) * c;

  return (
    <svg viewBox="0 0 100 100" className="h-20 w-20">
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke="hsl(var(--muted))"
        strokeWidth="8"
      />
      {/* Reading */}
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="8"
        strokeDasharray={`${seg1} ${c - seg1}`}
        strokeDashoffset="0"
        transform="rotate(-90 50 50)"
      />
      {/* Annotating */}
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke="hsl(45 93% 47%)"
        strokeWidth="8"
        strokeDasharray={`${seg2} ${c - seg2}`}
        strokeDashoffset={`${-seg1}`}
        transform="rotate(-90 50 50)"
      />
      {/* Cross-ref */}
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke="hsl(280 60% 60%)"
        strokeWidth="8"
        strokeDasharray={`${seg3} ${c - seg3}`}
        strokeDashoffset={`${-(seg1 + seg2)}`}
        transform="rotate(-90 50 50)"
      />
    </svg>
  );
}

/* ── AI Summary Section ── */
function AISummaryView({
  summary,
  onGenerate,
  loading,
}: {
  summary: SessionSummary | null;
  onGenerate?: () => void;
  loading?: boolean;
}) {
  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <Sparkles className="h-8 w-8 text-amber-500/60" />
        <p className="text-sm text-muted-foreground text-center">
          No study insights generated yet
        </p>
        {onGenerate && (
          <Button
            variant="outline"
            size="sm"
            onClick={onGenerate}
            disabled={loading}
            className="gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {loading ? "Generating…" : "Generate Insights"}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Thematic summary */}
      <p className="font-serif text-base leading-relaxed text-foreground">
        {summary.thematic_summary}
      </p>

      {/* Study arc */}
      <p className="text-xs font-mono text-muted-foreground italic">
        {summary.study_arc}
      </p>

      {/* Key insights */}
      {summary.key_insights.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Key Insights
          </h4>
          <ul className="space-y-1.5">
            {summary.key_insights.map((insight, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tags */}
      {summary.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {summary.tags.map((tag, i) => (
            <Badge
              key={i}
              variant="secondary"
              className="text-[0.65rem] font-medium"
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Time breakdown */}
      <div className="flex items-center gap-4">
        <DonutChart
          reading={summary.time_breakdown.reading_pct}
          annotating={summary.time_breakdown.annotating_pct}
          crossRef={summary.time_breakdown.cross_referencing_pct}
        />
        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary" />
            Reading {summary.time_breakdown.reading_pct}%
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: "hsl(45 93% 47%)" }} />
            Annotating {summary.time_breakdown.annotating_pct}%
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: "hsl(280 60% 60%)" }} />
            Cross-referencing {summary.time_breakdown.cross_referencing_pct}%
          </div>
        </div>
      </div>

      {/* Verse focus */}
      {summary.verse_focus.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            Verse Focus
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {summary.verse_focus.map((v, i) => (
              <span
                key={i}
                className="text-xs font-medium text-amber-700 dark:text-amber-400 underline underline-offset-2 decoration-amber-400/50"
              >
                {v}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Timeline Node ── */
function TimelineNode({
  cluster,
  isActive,
  onClick,
  index,
}: {
  cluster: EventCluster;
  isActive: boolean;
  onClick: () => void;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const isMulti = cluster.events.length > 1;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      className="relative flex items-start gap-3 group"
    >
      {/* Dot */}
      <button
        onClick={onClick}
        className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all flex-shrink-0 ${
          isActive
            ? "border-primary bg-primary text-primary-foreground scale-110"
            : "border-border bg-card text-muted-foreground hover:border-primary/50"
        }`}
      >
        {cluster.icon}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-4">
        <button
          onClick={isMulti ? () => setExpanded(!expanded) : onClick}
          className="flex items-center gap-1.5 text-left w-full"
        >
          <span
            className={`text-xs font-medium truncate ${
              isActive ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            {cluster.label}
          </span>
          {isMulti && (
            expanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />
          )}
        </button>
        <span className="text-[0.6rem] font-mono text-muted-foreground/70">
          {formatTime(cluster.timestamp)}
        </span>

        {/* Expanded sub-events */}
        <AnimatePresence>
          {expanded && isMulti && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-1 space-y-0.5"
            >
              {cluster.events.map((e) => (
                <div
                  key={e.id}
                  className="text-[0.6rem] text-muted-foreground pl-2 border-l border-border/50"
                >
                  {formatTime(e.created_at)}
                  {e.payload && Object.keys(e.payload).length > 0 && (
                    <span className="ml-1 opacity-60">
                      {JSON.stringify(e.payload).slice(0, 50)}
                    </span>
                  )}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ── Detail View ── */
function DetailView({
  activeCluster,
  summary,
  onGenerate,
  summaryLoading,
}: {
  activeCluster: EventCluster | null;
  summary: SessionSummary | null;
  onGenerate?: () => void;
  summaryLoading?: boolean;
}) {
  return (
    <AnimatePresence mode="wait">
      {activeCluster ? (
        <motion.div
          key={`event-${activeCluster.timestamp}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              {activeCluster.icon}
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">
                {activeCluster.label}
              </p>
              <p className="text-[0.6rem] font-mono text-muted-foreground">
                {formatTime(activeCluster.timestamp)}
              </p>
            </div>
          </div>

          {/* Event payloads */}
          {activeCluster.events.map((e) =>
            e.payload && Object.keys(e.payload).length > 0 ? (
              <div
                key={e.id}
                className="rounded-lg border border-border/50 bg-muted/30 p-3 text-xs font-mono text-muted-foreground"
              >
                {Object.entries(e.payload).map(([k, v]) => (
                  <div key={k}>
                    <span className="text-foreground/70">{k}:</span>{" "}
                    {String(v)}
                  </div>
                ))}
              </div>
            ) : null,
          )}
        </motion.div>
      ) : (
        <motion.div
          key="summary"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <AISummaryView
            summary={summary}
            onGenerate={onGenerate}
            loading={summaryLoading}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ═════════════════════════════════════════════
   SESSION REVIEW DRAWER
   ═════════════════════════════════════════════ */
export function SessionReviewDrawer({
  open,
  onClose,
  session,
  events,
  onGenerateSummary,
  summaryLoading,
}: SessionReviewDrawerProps) {
  const isMobile = useIsMobile();
  const [activeClusterIdx, setActiveClusterIdx] = useState<number | null>(null);

  const summary = session.session_summary as SessionSummary | null;
  const clusters = useMemo(() => clusterEvents(events), [events]);
  const activeCluster =
    activeClusterIdx !== null ? clusters[activeClusterIdx] ?? null : null;

  const sessionDate = new Date(session.created_at).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const verseLabel =
    session.verse_start && session.verse_end
      ? `${session.book_usfm} ${session.chapter_id}:${session.verse_start}–${session.verse_end}`
      : `${session.book_usfm} ${session.chapter_id}`;

  const handleSelectCluster = useCallback(
    (idx: number) => {
      setActiveClusterIdx((prev) => (prev === idx ? null : idx));
    },
    [],
  );

  return (
    <Drawer open={open} onOpenChange={(v) => !v && onClose()}>
      <DrawerContent
        className="max-h-[80vh] bg-background/98 backdrop-blur-xl dark:bg-zinc-950/98"
        style={{ minHeight: "50vh" }}
      >
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-base font-semibold">
            Session Review
          </DrawerTitle>
        </DrawerHeader>

        {/* Metadata bar */}
        <div className="flex items-center gap-3 px-4 pb-3 flex-wrap text-xs text-muted-foreground border-b border-border/50">
          <span>{sessionDate}</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatElapsed(session.elapsed_seconds)}
          </span>
          <span className="font-medium text-foreground">{verseLabel}</span>
          <span>{events.length} events</span>
          <Badge variant="outline" className="text-[0.6rem]">
            {(session as any).session_type === "reading"
              ? "Reading Session"
              : "Canvas Study"}
          </Badge>
        </div>

        <ScrollArea className="flex-1 px-4 py-4">
          {isMobile ? (
            /* ── Mobile: Stacked layout ── */
            <div className="space-y-6">
              {/* AI Summary */}
              <div className="rounded-xl border border-border/50 bg-card/50 p-4">
                <AISummaryView
                  summary={summary}
                  onGenerate={onGenerateSummary}
                  loading={summaryLoading}
                />
              </div>

              {/* Horizontal timeline */}
              {clusters.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Timeline
                  </h4>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border">
                    {clusters.map((c, i) => (
                      <button
                        key={i}
                        onClick={() => handleSelectCluster(i)}
                        className={`flex-shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs border transition-all ${
                          activeClusterIdx === i
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border bg-card text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        {c.icon}
                        <span className="truncate max-w-[100px]">{c.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Detail */}
              {activeCluster && (
                <div className="rounded-xl border border-border/50 bg-card/50 p-4">
                  <DetailView
                    activeCluster={activeCluster}
                    summary={summary}
                    onGenerate={onGenerateSummary}
                    summaryLoading={summaryLoading}
                  />
                </div>
              )}
            </div>
          ) : (
            /* ── Desktop/iPad: Bento grid ── */
            <div className="grid grid-cols-[35%_1fr] gap-4 min-h-[40vh]">
              {/* Left: Timeline */}
              <div className="relative">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Timeline
                </h4>
                <div className="relative">
                  {/* Vertical line */}
                  <div className="absolute left-3.5 top-0 bottom-0 w-px bg-border/50" />
                  <div className="space-y-0">
                    {clusters.map((c, i) => (
                      <TimelineNode
                        key={i}
                        cluster={c}
                        isActive={activeClusterIdx === i}
                        onClick={() => handleSelectCluster(i)}
                        index={i}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Detail / Summary */}
              <div className="rounded-xl border border-border/30 bg-card/30 backdrop-blur-sm p-5">
                <DetailView
                  activeCluster={activeCluster}
                  summary={summary}
                  onGenerate={onGenerateSummary}
                  summaryLoading={summaryLoading}
                />
              </div>
            </div>
          )}
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
