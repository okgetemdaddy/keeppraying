// iPadOS: Container maps to UISheetPresentationController with .large() detent and UIBlurEffect(.systemUltraThinMaterialDark)
import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
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
  Network,
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
  model_contributions?: {
    theological: string;
    statistical: string;
    behavioral: string;
  } | null;
  _raw_analyses?: Record<string, unknown> | null;
}

interface SessionDetailDashboardProps {
  open: boolean;
  onClose: () => void;
  session: StudySession;
  events: SessionEvent[];
  loading: boolean;
  onResume?: () => void;
}

/* ── Event icon map ── */
const EVENT_ICONS: Record<SessionEventType, React.ReactNode> = {
  verse_view: <Eye className="h-3.5 w-3.5" />,
  highlight_added: <Highlighter className="h-3.5 w-3.5 text-emerald-400" />,
  highlight_removed: <Highlighter className="h-3.5 w-3.5 opacity-40" />,
  note_written: <StickyNote className="h-3.5 w-3.5 text-sky-400" />,
  note_edited: <StickyNote className="h-3.5 w-3.5 text-sky-400" />,
  ink_stroke: <PenTool className="h-3.5 w-3.5 text-zinc-300" />,
  ink_erased: <PenTool className="h-3.5 w-3.5 opacity-40" />,
  circle_select: <Navigation className="h-3.5 w-3.5" />,
  cross_ref_nav: <Link2 className="h-3.5 w-3.5 text-purple-400" />,
  chapter_nav: <Navigation className="h-3.5 w-3.5 text-emerald-400" />,
  bookmark_added: <BookmarkCheck className="h-3.5 w-3.5 text-pink-400" />,
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

/* ── Utilities ── */
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatElapsed(seconds: number): string {
  if (seconds < 60) return "<1 minute";
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} minute${mins !== 1 ? "s" : ""}`;
  const hrs = Math.floor(mins / 60);
  const rm = mins % 60;
  return rm > 0 ? `${hrs}h ${rm}m` : `${hrs}h`;
}

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/* ── Cluster events within 2 min ── */
interface EventCluster {
  events: SessionEvent[];
  label: string;
  icon: React.ReactNode;
  timestamp: string;
  verseRef?: string;
  breakdown: Record<string, number>;
}

function clusterEvents(events: SessionEvent[]): EventCluster[] {
  if (events.length === 0) return [];
  const clusters: EventCluster[] = [];
  let current: SessionEvent[] = [events[0]];

  for (let i = 1; i < events.length; i++) {
    const prev = new Date(events[i - 1].created_at).getTime();
    const curr = new Date(events[i].created_at).getTime();
    if (curr - prev < 120_000) {
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
  const breakdown: Record<string, number> = {};
  const verses = new Set<string>();
  for (const e of events) {
    breakdown[e.event_type] = (breakdown[e.event_type] || 0) + 1;
    const p = e.payload as Record<string, unknown>;
    if (p?.verse) verses.add(String(p.verse));
    if (p?.verse_ref) verses.add(String(p.verse_ref));
  }

  const total = events.length;
  const types = Object.keys(breakdown);
  const label =
    total === 1
      ? EVENT_LABELS[events[0].event_type as SessionEventType]
      : types.length === 1
        ? `${total} ${EVENT_LABELS[events[0].event_type as SessionEventType].toLowerCase()}s`
        : `${total} annotations`;

  const verseArr = [...verses];
  const verseRef =
    verseArr.length > 0
      ? verseArr.length <= 2
        ? verseArr.join(", ")
        : `${verseArr[0]}–${verseArr[verseArr.length - 1]}`
      : undefined;

  return {
    events,
    label: verseRef ? `${label} · ${verseRef}` : label,
    icon: EVENT_ICONS[events[0].event_type as SessionEventType],
    timestamp: events[0].created_at,
    verseRef,
    breakdown,
  };
}

/* ── BentoCard wrapper ── */
// iPadOS: Hover maps to UIHoverGestureRecognizer on UIView with UIView.animate spring transform
function BentoCard({
  children,
  colSpan,
  rowSpan,
  className = "",
  isMobile,
}: {
  children: React.ReactNode;
  colSpan: number;
  rowSpan?: number;
  className?: string;
  isMobile: boolean;
}) {
  return (
    <motion.div
      whileHover={isMobile ? undefined : { scale: 1.015, y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      style={{
        gridColumn: isMobile ? "span 1" : `span ${colSpan}`,
        gridRow: rowSpan && !isMobile ? `span ${rowSpan}` : undefined,
      }}
      className={`rounded-xl p-5 ${className}`}
      // iPadOS: Maps to UIVisualEffectView with UIBlurEffect(.systemThinMaterialDark)
    >
      {children}
    </motion.div>
  );
}

/* ═════════════════════════════════════════════
   MODULE 1 — COMMAND HEADER
   ═════════════════════════════════════════════ */
// iPadOS: Maps to UINavigationBar with .inline display mode inside sheet
function CommandHeader({
  session,
  onClose,
  onResume,
}: {
  session: StudySession;
  onClose: () => void;
  onResume?: () => void;
}) {
  const summary = session.session_summary as unknown as SessionSummary | null;
  const verseLabel =
    session.verse_start && session.verse_end
      ? `${session.book_usfm} ${session.chapter_id}:${session.verse_start}–${session.verse_end}`
      : `${session.book_usfm} ${session.chapter_id}`;

  const title = summary?.thematic_summary
    ? summary.thematic_summary.split(".")[0] + "."
    : verseLabel;

  const sessionType = (session as any).session_type;
  const canResume =
    sessionType !== "reading" &&
    (session.status === "paused" || session.status === "active");

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <h2
          className="font-serif text-xl md:text-2xl leading-tight tracking-tight"
          style={{ color: "rgba(255, 255, 255, 0.92)" }}
        >
          {title}
        </h2>
        <div className="flex items-center gap-3 mt-2 flex-wrap text-xs">
          <span style={{ color: "rgba(255, 255, 255, 0.5)" }}>
            {formatFullDate(session.created_at)}
          </span>
          <span className="flex items-center gap-1" style={{ color: "rgba(255, 255, 255, 0.5)" }}>
            <Clock className="h-3 w-3" />
            {formatElapsed(session.elapsed_seconds)}
          </span>
          <span
            className="px-2 py-0.5 rounded-full text-[0.6rem] font-semibold uppercase tracking-wider"
            style={{
              background:
                sessionType === "reading"
                  ? "rgba(56, 189, 248, 0.15)"
                  : "rgba(245, 158, 11, 0.15)",
              color:
                sessionType === "reading"
                  ? "rgb(125, 211, 252)"
                  : "rgb(252, 211, 77)",
              border: `1px solid ${
                sessionType === "reading"
                  ? "rgba(56, 189, 248, 0.2)"
                  : "rgba(245, 158, 11, 0.2)"
              }`,
            }}
          >
            {sessionType === "reading" ? "Reading Session" : "Canvas Study"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {canResume && onResume ? (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onResume}
            className="px-6 py-2.5 rounded-xl font-serif text-sm font-semibold tracking-wide"
            style={{
              background: "linear-gradient(135deg, hsl(38 92% 50%), hsl(30 80% 45%))",
              color: "#1a1410",
              boxShadow: "0 4px 20px -4px rgba(184, 92, 56, 0.4)",
            }}
          >
            Resume Session
          </motion.button>
        ) : (
          <button
            className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: "rgba(255, 255, 255, 0.5)" }}
          >
            Jump to {session.book_usfm} {session.chapter_id}
          </button>
        )}
        <button
          onClick={onClose}
          className="p-2 rounded-lg transition-colors"
          style={{ color: "rgba(255, 255, 255, 0.4)" }}
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════
   MODULE 2 — AI SYNTHESIS
   ═════════════════════════════════════════════ */
// iPadOS: Maps to UITextView with NSAttributedString rendered via TextKit 2
function AISynthesisModule({
  session,
  loading,
}: {
  session: StudySession;
  loading: boolean;
}) {
  const summary = session.session_summary as unknown as SessionSummary | null;

  if (!summary) {
    return (
      <div className="space-y-3">
        {/* Pulsing skeleton */}
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-3 rounded-full animate-pulse"
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              width: `${85 - i * 15}%`,
            }}
          />
        ))}
        <p
          className="text-xs italic mt-4"
          style={{ color: "rgba(255, 255, 255, 0.35)" }}
        >
          {loading ? "Generating insights..." : "Awaiting analysis..."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Study Arc */}
      <p
        className="text-xs font-medium tracking-wide uppercase"
        style={{ color: "rgb(252, 211, 77)" }}
      >
        {summary.study_arc}
      </p>

      {/* Thematic Summary */}
      <p
        className="font-serif text-sm leading-relaxed"
        style={{ color: "rgba(255, 255, 255, 0.85)" }}
      >
        {summary.thematic_summary}
      </p>

      {/* Key Insights */}
      {summary.key_insights.length > 0 && (
        <ul className="space-y-1.5">
          {summary.key_insights.map((insight, i) => (
            <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "rgba(255, 255, 255, 0.7)" }}>
              <span className="mt-0.5 text-amber-400/80 text-xs">✦</span>
              {insight}
            </li>
          ))}
        </ul>
      )}

      {/* Tags */}
      {summary.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {summary.tags.map((tag, i) => (
            <span
              key={i}
              className="text-[0.6rem] px-2 py-0.5 rounded-full"
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "rgba(161, 161, 170, 1)",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════
   MODULE 3 — STUDY ANALYTICS
   ═════════════════════════════════════════════ */
// iPadOS: Maps to SwiftUI Chart with .chartXAxis and .chartPlotStyle modifiers
function StudyAnalyticsModule({
  session,
  events,
}: {
  session: StudySession;
  events: SessionEvent[];
}) {
  const analytics = useMemo(() => {
    const distinctVerses = new Set<string>();
    let inkStrokes = 0;
    let highlights = 0;
    let notes = 0;
    let crossRefs = 0;

    for (const e of events) {
      const p = e.payload as Record<string, unknown>;
      if (p?.verse) distinctVerses.add(String(p.verse));
      if (p?.verse_ref) distinctVerses.add(String(p.verse_ref));

      switch (e.event_type) {
        case "ink_stroke":
          inkStrokes++;
          break;
        case "highlight_added":
          highlights++;
          break;
        case "note_written":
        case "note_edited":
          notes++;
          break;
        case "cross_ref_nav":
          crossRefs++;
          break;
      }
    }

    const totalMinutes = Math.max(1, session.elapsed_seconds / 60);
    const totalVerses = Math.max(1, distinctVerses.size);
    const totalAnnotations = inkStrokes + highlights + notes;

    const readingVelocity = (totalVerses / totalMinutes).toFixed(1);
    const exegesisDepth = (totalAnnotations / totalVerses).toFixed(1);

    const toolTotal = inkStrokes + highlights + notes + crossRefs || 1;
    const tools = [
      { label: "Ink", count: inkStrokes, pct: Math.round((inkStrokes / toolTotal) * 100), color: "rgb(252, 211, 77)" },
      { label: "Highlights", count: highlights, pct: Math.round((highlights / toolTotal) * 100), color: "rgb(74, 222, 128)" },
      { label: "Notes", count: notes, pct: Math.round((notes / toolTotal) * 100), color: "rgb(96, 165, 250)" },
      { label: "Cross-refs", count: crossRefs, pct: Math.round((crossRefs / toolTotal) * 100), color: "rgb(192, 132, 252)" },
    ];

    // Top verses by event count
    const verseCounts: Record<string, number> = {};
    for (const e of events) {
      const p = e.payload as Record<string, unknown>;
      const v = String(p?.verse || p?.verse_ref || "");
      if (v) verseCounts[v] = (verseCounts[v] || 0) + 1;
    }
    const verseFocus = Object.entries(verseCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([v]) => v);

    return { readingVelocity, exegesisDepth, tools, verseFocus };
  }, [events, session.elapsed_seconds]);

  const summary = session.session_summary as unknown as SessionSummary | null;
  const verseFocusDisplay = summary?.verse_focus?.length ? summary.verse_focus : analytics.verseFocus;

  return (
    <div className="space-y-5">
      {/* Velocity & Depth */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <span
            className="text-3xl font-light tabular-nums tracking-tight"
            style={{ color: "rgba(255, 255, 255, 0.9)" }}
          >
            {analytics.readingVelocity}
          </span>
          <p className="text-[0.6rem] uppercase tracking-wider mt-0.5" style={{ color: "rgba(255, 255, 255, 0.4)" }}>
            verses / min
          </p>
        </div>
        <div>
          <span
            className="text-3xl font-light tabular-nums tracking-tight"
            style={{ color: "rgba(255, 255, 255, 0.9)" }}
          >
            {analytics.exegesisDepth}
          </span>
          <p className="text-[0.6rem] uppercase tracking-wider mt-0.5" style={{ color: "rgba(255, 255, 255, 0.4)" }}>
            annotations / verse
          </p>
        </div>
      </div>

      {/* Tool Breakdown — horizontal stacked bar */}
      <div>
        <p className="text-[0.6rem] uppercase tracking-wider mb-2" style={{ color: "rgba(255, 255, 255, 0.4)" }}>
          Tool Usage
        </p>
        <div className="h-3 rounded-full overflow-hidden flex" style={{ background: "rgba(255, 255, 255, 0.06)" }}>
          {analytics.tools.map(
            (t) =>
              t.pct > 0 && (
                <motion.div
                  key={t.label}
                  initial={{ width: 0 }}
                  animate={{ width: `${t.pct}%` }}
                  transition={{ type: "spring", stiffness: 200, damping: 25, delay: 0.3 }}
                  style={{ background: t.color }}
                  className="h-full"
                />
              ),
          )}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
          {analytics.tools.map((t) => (
            <div key={t.label} className="flex items-center gap-1.5 text-[0.6rem]">
              <span className="h-2 w-2 rounded-full" style={{ background: t.color }} />
              <span style={{ color: "rgba(255, 255, 255, 0.5)" }}>
                {t.label} {t.pct}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Verse Focus */}
      {verseFocusDisplay.length > 0 && (
        <div>
          <p className="text-[0.6rem] uppercase tracking-wider mb-1.5" style={{ color: "rgba(255, 255, 255, 0.4)" }}>
            Verse Focus
          </p>
          <div className="flex flex-wrap gap-2">
            {verseFocusDisplay.map((v, i) => (
              <span
                key={i}
                className="text-xs font-medium"
                style={{ color: "rgb(252, 211, 77)" }}
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

/* ═════════════════════════════════════════════
   MODULE 4 — CROSS-REFERENCE CONSTELLATION
   ═════════════════════════════════════════════ */
// iPadOS: Constellation view maps to SceneKit SCNView with SCNNode spheres for full 3D spatial graph
function ConstellationModule({ events, session }: { events: SessionEvent[]; session: StudySession }) {
  const graph = useMemo(() => {
    const crossRefEvents = events.filter((e) => e.event_type === "cross_ref_nav");
    if (crossRefEvents.length === 0) return null;

    const nodes = new Set<string>();
    const edgeMap: Record<string, number> = {};

    for (const e of crossRefEvents) {
      const p = e.payload as Record<string, unknown>;
      const from = String(p?.from_verse || `${session.book_usfm} ${session.chapter_id}`);
      const to = String(p?.target || p?.verse_ref || "unknown");
      nodes.add(from);
      nodes.add(to);
      const key = `${from}→${to}`;
      edgeMap[key] = (edgeMap[key] || 0) + 1;
    }

    const nodeArr = [...nodes];
    const primaryChapter = `${session.book_usfm} ${session.chapter_id}`;
    const centerIdx = nodeArr.indexOf(primaryChapter);

    // Circular layout
    const cx = 150, cy = 100, radius = 70;
    const positions: Record<string, { x: number; y: number }> = {};

    nodeArr.forEach((n, i) => {
      if (n === primaryChapter || i === centerIdx) {
        positions[n] = { x: cx, y: cy };
      } else {
        const angle = ((i - (centerIdx >= 0 ? 1 : 0)) / (nodeArr.length - 1)) * Math.PI * 2 - Math.PI / 2;
        positions[n] = {
          x: cx + Math.cos(angle) * radius,
          y: cy + Math.sin(angle) * radius,
        };
      }
    });

    const edges = Object.entries(edgeMap).map(([key, weight]) => {
      const [from, to] = key.split("→");
      return { from, to, weight };
    });

    return { nodes: nodeArr, edges, positions, primaryChapter };
  }, [events, session.book_usfm, session.chapter_id]);

  if (!graph) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[160px] gap-3">
        <Network className="h-8 w-8" style={{ color: "rgba(255, 255, 255, 0.15)" }} />
        <p className="text-xs text-center leading-relaxed" style={{ color: "rgba(255, 255, 255, 0.35)" }}>
          No cross-references explored
          <br />
          <span className="text-[0.6rem]" style={{ color: "rgba(255, 255, 255, 0.25)" }}>
            Circle a word with Apple Pencil to discover connections
          </span>
        </p>
      </div>
    );
  }

  return (
    <svg viewBox="0 0 300 200" className="w-full h-full min-h-[160px]">
      {/* Edges */}
      {graph.edges.map((edge, i) => {
        const from = graph.positions[edge.from];
        const to = graph.positions[edge.to];
        if (!from || !to) return null;
        return (
          <motion.line
            key={i}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke="rgba(252, 211, 77, 0.3)"
            strokeWidth={Math.min(3, edge.weight)}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, delay: i * 0.1, type: "spring", stiffness: 100, damping: 20 }}
          />
        );
      })}
      {/* Nodes */}
      {graph.nodes.map((node) => {
        const pos = graph.positions[node];
        if (!pos) return null;
        const isPrimary = node === graph.primaryChapter;
        return (
          <g key={node}>
            <circle
              cx={pos.x}
              cy={pos.y}
              r={isPrimary ? 10 : 6}
              fill={isPrimary ? "rgba(252, 211, 77, 0.8)" : "rgba(161, 161, 170, 0.5)"}
            />
            <text
              x={pos.x}
              y={pos.y + (isPrimary ? 20 : 16)}
              textAnchor="middle"
              fill={isPrimary ? "rgba(252, 211, 77, 0.7)" : "rgba(161, 161, 170, 0.5)"}
              fontSize={isPrimary ? 8 : 7}
              fontFamily="sans-serif"
            >
              {node.length > 14 ? node.slice(0, 12) + "…" : node}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ═════════════════════════════════════════════
   MODULE 5 — SPATIAL TIMELINE
   ═════════════════════════════════════════════ */
// iPadOS: Maps to UICollectionView with UICollectionLayoutListConfiguration and .sidebar appearance
function SpatialTimeline({
  events,
  isMobile,
}: {
  events: SessionEvent[];
  isMobile: boolean;
}) {
  const clusters = useMemo(() => clusterEvents(events), [events]);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (clusters.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[160px]">
        <p className="text-xs" style={{ color: "rgba(255, 255, 255, 0.35)" }}>
          No events recorded
        </p>
      </div>
    );
  }

  return (
    <div className={`relative ${isMobile ? "overflow-x-auto pb-2 flex gap-3" : "overflow-y-auto max-h-[340px] pr-1"}`}>
      {/* Vertical timeline line (desktop only) */}
      {!isMobile && (
        <div
          className="absolute left-[11px] top-0 bottom-0 w-px"
          style={{ background: "rgba(63, 63, 70, 1)" }}
        />
      )}

      {clusters.map((cluster, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 25 }}
          className={isMobile ? "flex-shrink-0 w-[200px]" : "relative flex items-start gap-3 mb-3"}
          onMouseEnter={() => setHoveredIdx(i)}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          {/* Node dot (desktop) */}
          {!isMobile && (
            <div
              className="relative z-10 flex-shrink-0 mt-1 h-[22px] w-[22px] rounded-full flex items-center justify-center"
              style={{
                background: expandedIdx === i ? "rgba(252, 211, 77, 0.2)" : "rgba(255, 255, 255, 0.06)",
                border: `1px solid ${expandedIdx === i ? "rgba(252, 211, 77, 0.4)" : "rgba(255, 255, 255, 0.1)"}`,
              }}
            >
              <div
                className="h-[6px] w-[6px] rounded-full"
                style={{ background: expandedIdx === i ? "rgb(252, 211, 77)" : "rgba(161, 161, 170, 0.6)" }}
              />
            </div>
          )}

          {/* Content */}
          <button
            onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
            className={`text-left w-full rounded-lg p-2.5 transition-colors ${
              isMobile ? "" : ""
            }`}
            style={{
              background: expandedIdx === i ? "rgba(255, 255, 255, 0.04)" : "transparent",
            }}
          >
            <div className="flex items-center gap-1.5">
              {cluster.icon}
              <span className="text-xs font-medium truncate" style={{ color: "rgba(255, 255, 255, 0.7)" }}>
                {cluster.label}
              </span>
              {cluster.events.length > 1 && (
                expandedIdx === i
                  ? <ChevronDown className="h-3 w-3 ml-auto" style={{ color: "rgba(255, 255, 255, 0.3)" }} />
                  : <ChevronRight className="h-3 w-3 ml-auto" style={{ color: "rgba(255, 255, 255, 0.3)" }} />
              )}
            </div>
            <span className="text-[0.6rem] mt-0.5 block" style={{ color: "rgba(255, 255, 255, 0.3)" }}>
              {formatTime(cluster.timestamp)}
            </span>
          </button>

          {/* Hover tooltip (desktop only) */}
          <AnimatePresence>
            {!isMobile && hoveredIdx === i && cluster.events.length > 1 && expandedIdx !== i && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="absolute left-8 -top-2 z-20 px-3 py-2 rounded-lg"
                style={{
                  background: "rgba(24, 24, 27, 0.85)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  boxShadow: "0 8px 32px -8px rgba(0, 0, 0, 0.5)",
                }}
              >
                {Object.entries(cluster.breakdown).map(([type, count]) => (
                  <div key={type} className="flex items-center gap-1.5 text-[0.6rem]" style={{ color: "rgba(255, 255, 255, 0.5)" }}>
                    {EVENT_ICONS[type as SessionEventType]}
                    <span>{count} {EVENT_LABELS[type as SessionEventType]?.toLowerCase()}{count > 1 ? "s" : ""}</span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Expanded sub-events */}
          <AnimatePresence>
            {expandedIdx === i && cluster.events.length > 1 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className={`overflow-hidden ${isMobile ? "mt-1" : "absolute left-10 top-full mt-0 w-[calc(100%-44px)]"}`}
              >
                <div className="space-y-1 py-1">
                  {cluster.events.map((e) => {
                    const p = e.payload as Record<string, unknown>;
                    const snippet = p?.text
                      ? String(p.text).slice(0, 40) + (String(p.text).length > 40 ? "…" : "")
                      : p?.verse_ref
                        ? String(p.verse_ref)
                        : null;
                    return (
                      <div
                        key={e.id}
                        className="flex items-center gap-1.5 text-[0.6rem] pl-2"
                        style={{
                          borderLeft: "1px solid rgba(255, 255, 255, 0.06)",
                          color: "rgba(255, 255, 255, 0.4)",
                        }}
                      >
                        {EVENT_ICONS[e.event_type as SessionEventType]}
                        <span>{formatTime(e.created_at)}</span>
                        {snippet && (
                          <span className="truncate italic" style={{ color: "rgba(255, 255, 255, 0.25)" }}>
                            {snippet}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════
   SESSION DETAIL DASHBOARD — MAIN EXPORT
   ═════════════════════════════════════════════════════════ */
export function SessionDetailDashboard({
  open,
  onClose,
  session,
  events,
  loading,
  onResume,
}: SessionDetailDashboardProps) {
  const isMobile = useIsMobile();

  if (!session) return null;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0"
            style={{ background: "rgba(0, 0, 0, 0.4)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Dashboard container */}
          {/* iPadOS: Maps to UISheetPresentationController with .large() detent */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            style={{
              background: "rgba(24, 24, 27, 0.40)",
              backdropFilter: "blur(64px) saturate(1.5)",
              WebkitBackdropFilter: "blur(64px) saturate(1.5)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
            }}
            className={`relative overflow-hidden flex flex-col ${
              isMobile
                ? "w-screen h-screen rounded-none"
                : "w-[92vw] max-w-[1200px] h-[88vh] rounded-2xl"
            }`}
          >
            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-5">
              <div
                className={
                  isMobile
                    ? "flex flex-col gap-3"
                    : "grid gap-3"
                }
                style={
                  isMobile
                    ? undefined
                    : {
                        gridTemplateColumns: "repeat(12, 1fr)",
                      }
                }
              >
                {/* Module 1: Command Header — span 12 */}
                <BentoCard colSpan={12} isMobile={isMobile} className="bg-white/[0.03] border border-white/[0.06] backdrop-blur-[20px]">
                  <CommandHeader session={session} onClose={onClose} onResume={onResume} />
                </BentoCard>

                {/* Module 2: AI Synthesis — span 7 desktop, rows 2-3 */}
                <BentoCard colSpan={7} rowSpan={2} isMobile={isMobile} className="bg-white/[0.03] border border-white/[0.06] backdrop-blur-[20px]">
                  <h3
                    className="text-[0.6rem] uppercase tracking-widest font-semibold mb-3"
                    style={{ color: "rgba(255, 255, 255, 0.3)" }}
                  >
                    <Sparkles className="h-3 w-3 inline mr-1.5 -mt-0.5" style={{ color: "rgb(252, 211, 77)" }} />
                    Study Insights
                  </h3>
                  <AISynthesisModule session={session} loading={loading} />
                </BentoCard>

                {/* Module 3: Study Analytics — span 5, rows 2-3 */}
                <BentoCard colSpan={5} rowSpan={2} isMobile={isMobile} className="bg-white/[0.03] border border-white/[0.06] backdrop-blur-[20px]">
                  <h3
                    className="text-[0.6rem] uppercase tracking-widest font-semibold mb-3"
                    style={{ color: "rgba(255, 255, 255, 0.3)" }}
                  >
                    Analytics
                  </h3>
                  <StudyAnalyticsModule session={session} events={events} />
                </BentoCard>

                {/* Module 4: Cross-Reference Constellation — span 6, rows 4-5 */}
                <BentoCard colSpan={6} rowSpan={2} isMobile={isMobile} className="bg-white/[0.03] border border-white/[0.06] backdrop-blur-[20px]">
                  <h3
                    className="text-[0.6rem] uppercase tracking-widest font-semibold mb-3"
                    style={{ color: "rgba(255, 255, 255, 0.3)" }}
                  >
                    Cross-Reference Constellation
                  </h3>
                  <ConstellationModule events={events} session={session} />
                </BentoCard>

                {/* Module 5: Spatial Timeline — span 6, rows 4-5 */}
                <BentoCard colSpan={6} rowSpan={2} isMobile={isMobile} className="bg-white/[0.03] border border-white/[0.06] backdrop-blur-[20px]">
                  <h3
                    className="text-[0.6rem] uppercase tracking-widest font-semibold mb-3"
                    style={{ color: "rgba(255, 255, 255, 0.3)" }}
                  >
                    Timeline
                  </h3>
                  <SpatialTimeline events={events} isMobile={isMobile} />
                </BentoCard>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
