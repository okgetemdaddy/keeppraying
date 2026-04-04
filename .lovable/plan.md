

## Session Telemetry Engine, AI Summary, and Interactive Session Drawer

A 7-part feature spanning database schema, a telemetry hook, an edge function, implicit reading sessions, iPad nav locking, a review drawer, and wiring it all together.

---

### Part 1: Database Migration

Create `session_event_type` enum, `session_events` table with indexes and RLS, add `session_summary` JSONB and `session_type` TEXT columns to `study_sessions`.

```sql
CREATE TYPE session_event_type AS ENUM (
  'verse_view','highlight_added','highlight_removed','note_written','note_edited',
  'ink_stroke','ink_erased','circle_select','cross_ref_nav','chapter_nav',
  'bookmark_added','bookmark_removed','session_start','session_end'
);

CREATE TABLE session_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type session_event_type NOT NULL,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_session_events_session ON session_events(session_id, created_at);
CREATE INDEX idx_session_events_user ON session_events(user_id);
ALTER TABLE session_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their events" ON session_events FOR ALL USING (auth.uid() = user_id);

ALTER TABLE study_sessions ADD COLUMN session_summary JSONB DEFAULT NULL;
ALTER TABLE study_sessions ADD COLUMN session_type TEXT DEFAULT 'canvas';
```

Update `StudySession` interface in `useStudySessions.ts` to include `session_summary` and `session_type`.

---

### Part 2: `src/hooks/useSessionTelemetry.ts`

New hook: `useSessionTelemetry(sessionId: string | null)`.

- Returns `logEvent(eventType, payload?)` and `getEventCount()`.
- Internal buffer of up to 5 events; flushes to `session_events` via batch insert on buffer full or every 10 seconds.
- `verse_view` debounced at 2s. `ink_stroke` stores `{ annotation_key, stroke_count }` only. `highlight_added` stores `{ verse_number, color, text_snippet }` (60 chars). `note_written` stores `{ verse_number, note_snippet }` (100 chars).
- No-ops when `sessionId` is null.
- iPadOS port comment included.

---

### Part 3: Edge Function `supabase/functions/summarize-session/index.ts`

- Accepts `{ session_id }`, verifies ownership via JWT.
- Queries `session_events` and `study_sessions` for context.
- Builds prompt for Grok API (`grok-4-0709` via `api.x.ai`, using `GROK_API_KEY` secret which already exists).
- Expects structured `SessionSummary` response (thematic_summary, key_insights, study_arc, tags, time_breakdown, verse_focus).
- Writes result to `study_sessions.session_summary`.
- Fallback: raw stats summary if AI fails.
- AI provider abstraction TODO comment.

---

### Part 4: Implicit Reading Sessions in `BibleReader.tsx`

- Track `activeReadingSessionId` (separate from canvas `activeSessionId`).
- Auto-create a `study_sessions` row with `session_type: 'reading'` after first meaningful interaction (highlight, note, bookmark, or 30s sustained reading).
- Wire `useSessionTelemetry(activeReadingSessionId)` and call `logEvent` from existing handlers: `handleHighlight`, `handleSaveNote`, `handleToggleBookmark`, chapter nav changes, cross-ref opens.
- Auto-end after 5 minutes of inactivity or navigation away. On end, call `summarize-session`.
- Chapter navigation logs `chapter_nav` events, doesn't create new sessions.

---

### Part 5: iPad Study Mode — Lock Navigation

When `studyMode && studyModeVariant === "margin"`:

- In the floating nav overlay (~line 2339), hide version/book/chapter `Select` dropdowns and chapter arrows.
- Hide `ChapterThumbnailStrip`.
- Show a locked session indicator: `🔒 Genesis 1:1–12 · Session Active · 12:34 elapsed` using `activeSessionConfig.verseRange` and a live timer from the heartbeat.
- User must exit study mode to navigate elsewhere.
- iPadOS port comment.

Changes in `BibleReader.tsx` in the `studyNavOpen` overlay section and wherever `ChapterThumbnailStrip` is rendered.

---

### Part 6: `src/components/bible/SessionReviewDrawer.tsx`

80vh bottom drawer (using `Drawer` from vaul) with:

- **Props**: `open`, `onClose`, `session: StudySession`, `events: SessionEvent[]`.
- **Desktop/iPad (>768px)**: Bento grid — metadata bar top, left 35% timeline, right 65% detail/AI summary.
- **Mobile**: Stacked — AI summary top, horizontal timeline strip, detail below.
- **Timeline**: Vertical (desktop) / horizontal (mobile) with timestamped event nodes, icons per type, connected line. Tapping sets `activeEvent`. Events clustered within 2 minutes collapse into expandable groups.
- **AI Summary**: Serif hero text for `thematic_summary`, amber-accented `key_insights` list, pill `tags`, donut chart for `time_breakdown` (pure SVG), `verse_focus` with amber underlines. "Generate Summary" button if null.
- **Framer Motion**: Spring drawer, crossfade detail views, staggered timeline nodes.
- **Premium aesthetic**: Dark `bg-zinc-950/98 backdrop-blur-xl` with noise texture; light `bg-white/98`. Glassmorphic cards. Serif + monospace typography.
- iPadOS port comment.

---

### Part 7: Wire into Session Cards

- In `BibleSleeveSheet` / `SessionCards`: tapping a session card opens `SessionReviewDrawer` instead of (or in addition to) resuming.
- Lazy-fetch `session_events` on drawer open.
- Auto-trigger `summarize-session` if `session_summary` is null on first open.
- Cache events and summary in React state for instant re-open.

---

### Files Summary

| File | Change |
|------|--------|
| Migration SQL | New table, enum, columns, RLS |
| `src/hooks/useStudySessions.ts` | Add `session_summary`, `session_type` to interface |
| `src/hooks/useSessionTelemetry.ts` | New hook — batched event logger |
| `supabase/functions/summarize-session/index.ts` | New edge function — AI session summary |
| `src/components/bible/BibleReader.tsx` | Implicit reading sessions, telemetry wiring, iPad nav lock |
| `src/components/bible/SessionReviewDrawer.tsx` | New — interactive session review drawer |
| `src/components/bible/SessionCards.tsx` | Wire tap → open review drawer |
| `src/components/bible/BibleSleeveSheet.tsx` | Integrate SessionReviewDrawer |

