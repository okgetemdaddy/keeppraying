

## Replace SessionReviewDrawer with SessionDetailDashboard — Premium Bento Grid

### Overview
Delete `SessionReviewDrawer.tsx` and create `SessionDetailDashboard.tsx` — a full-screen glassmorphic overlay with a 12-column bento grid layout, replacing the bottom drawer with an iPadOS-inspired spatial environment.

### Files

| File | Action |
|------|--------|
| `src/components/bible/SessionDetailDashboard.tsx` | **Create** — full component with BentoCard wrapper + 5 modules |
| `src/components/bible/BibleSleeveSheet.tsx` | **Edit** — swap import & usage from SessionReviewDrawer → SessionDetailDashboard |
| `src/components/bible/SessionReviewDrawer.tsx` | **Delete** |

### New Component: `SessionDetailDashboard.tsx`

**Props**: `open`, `onClose`, `session: StudySession`, `events: SessionEvent[]`, `loading: boolean`, `onResume?: () => void`

**Container**: Fixed overlay at `z-[200]`. Black/40 backdrop with `onClick={onClose}`. Inner panel: `w-[92vw] max-w-[1200px] h-[88vh]` centered, `rounded-2xl`, glass blur (`rgba(24,24,27,0.40)`, `backdrop-filter: blur(64px) saturate(1.5)`). On mobile (<768px): full-screen `100vw × 100vh`. Framer Motion spring entrance (`scale 0.95→1, y 20→0`).

**Inner layout**: Scrollable area with 12-column CSS grid, `gap-3`, `p-5`. Mobile: single-column stack.

**BentoCard wrapper** (inline component): Accepts `colSpan`, `rowSpan`, `className`. Renders `motion.div` with `whileHover={{ scale: 1.015, y: -2 }}` (disabled on mobile via `useIsMobile`), translucent card (`rgba(255,255,255,0.03)`, `border rgba(255,255,255,0.06)`, `backdrop-blur(20px)`, `rounded-xl`).

**Module 1 — Command Header** (span 12, row 1):
- Left: Thematic title from `session_summary?.thematic_summary` (EB Garamond ~24px) or verse range fallback. Date formatted as full weekday ("Tuesday, April 1, 2026"), elapsed time, session type badge.
- Right: "Resume Session" button (amber gradient, `whileTap scale 0.97`) for paused/active canvas sessions. "Jump to {chapter}" text button otherwise.
- Close X button top-right.

**Module 2 — AI Synthesis** (span 7 desktop, full mobile, rows 2-3):
- `study_arc` as amber subtitle, `thematic_summary` in serif, `key_insights` with ✦ markers, `tags` as pill badges (`bg-white/5 border-white/10 text-zinc-400`).
- Empty state: pulsing skeleton bars + "Generating insights..." italic text. Auto-trigger `summarize-session` edge function if summary is null (reuse existing logic from BibleSleeveSheet).

**Module 3 — Study Analytics** (span 5 desktop, full mobile, rows 2-3):
- Computed from raw `events` array in a `useMemo`:
  - Reading Velocity: distinct verses viewed / session minutes (large ~32px number + "verses/min" label)
  - Exegesis Depth: (ink + highlights + notes) / distinct verses (number + "annotations/verse")
  - Tool Breakdown: horizontal stacked bar (amber=ink, green=highlights, blue=notes, purple=cross-refs) with percentages
  - Verse Focus: from `session_summary?.verse_focus` or computed top 2-3 verses by event count

**Module 4 — Cross-Reference Constellation** (span 6 desktop, full mobile, rows 4-5):
- Filter events for `cross_ref_nav`. Build node/edge graph from `payload.from_verse` and `payload.target`.
- Circular SVG layout: primary chapter center, cross-refs radiating outward. Nodes = 8px circles (amber for primary, zinc-400 for cross-refs). Edges = `<line>` with stroke-width scaled by navigation count.
- Framer Motion `pathLength` animation on edges.
- Empty state: "No cross-references explored" with network icon.

**Module 5 — Spatial Timeline** (span 6 desktop, full mobile, rows 4-5):
- Vertical scrollable timeline (horizontal on mobile). Events clustered within 2-minute windows (reuse `clusterEvents` logic from old drawer).
- Cluster nodes: expandable via `AnimatePresence` with `layout`. Icons per event type (same icon map). Show verse ref + 40-char payload snippet.
- Thin vertical line (1px zinc-700) connecting nodes. 6px circles on the line.
- Staggered entrance: `staggerChildren: 0.05` from bottom to top.
- Hover tooltip on clusters showing event count breakdown.

### BibleSleeveSheet.tsx Changes

- Line 4: Change import from `SessionReviewDrawer` → `SessionDetailDashboard`
- Lines 1026-1033: Replace `<SessionReviewDrawer>` with `<SessionDetailDashboard>`, adding `loading={reviewLoading}` prop. The `onResume` prop wires to the existing resume handler (currently logs to console — keep as-is, it's wired upstream).

### Technical Notes

- All animations use Framer Motion spring physics — no CSS transitions.
- No external charting libraries. All visualizations are raw SVG + Framer Motion.
- Dark mode only — component always renders on glassmorphic dark overlay.
- `AnimatePresence` wraps the entire dashboard for exit animations.
- iPadOS port comments on every major section.
- Mobile responsive: grid collapses to single column, module order is Header → AI → Analytics → Timeline → Constellation, `whileHover` disabled.

