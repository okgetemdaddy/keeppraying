

## Canvas Creation Drawer Upgrade + Session Persistence + Gesture Education Overlay

This is a large feature spanning ~8 files. Breaking it into clear phases.

### Phase 1: Upgrade CanvasCreationDrawer

**File: `src/components/bible/CanvasCreationDrawer.tsx`** — Major rewrite

The existing drawer already has ~80% of the requested functionality (verse picker, paper presets, chars-per-line slider, line spacing slider, text box drag/resize with handles, split-pane desktop / stacked mobile, live preview with actual Bible text). Changes needed:

- **Paper presets**: Replace current dropdown with tap-to-select buttons: "Full Page" (1056×1632), "Half Page" (1056×816), "Square" (1056×1056), "Custom". Keep existing custom slider inputs.
- **Line spacing**: Replace slider with 4 preset buttons matching CanvasSetupSheet (Tight 1.8×, Comfortable 2.4×, Generous 2.8×, Wide Open 3.5×).
- **Chars-per-line slider**: Adjust range to 30–100, default 60, add "~XX chars per line" label.
- **Text Box Position section**: Make collapsible (collapsed by default) with numeric inch inputs for top/left offset. Add explainer text.
- **Session Timer section**: Add toggle "Timed session" (default off). When on, show duration picker (15/30/45/60/Custom min).
- **Margin style**: Add existing `MarginCanvas` rendering (blank/ruled/dotgrid) to preview pane, with selector in config pane.
- **Mobile layout**: Change from stacked to tabbed (Config | Preview) tabs.
- **"Begin Study" CTA**: Full-width, warm amber/gold gradient, font-serif. Sacred styling.
- **No backdrop dismiss**: Remove any implicit close-on-backdrop behavior; require explicit Cancel button.
- **Apple Pencil hover**: `cursor: crosshair` on the preview pane.
- **Dimension badge**: Show `X.X" × Y.Y"` badge on the text bounding box in the preview.
- **Update `CanvasSessionConfig` type**: Add `marginStyle`, `timerMinutes`, `fontSize` fields.

### Phase 2: Database — `study_sessions` Insert on "Begin Study"

**File: `src/components/bible/CanvasCreationDrawer.tsx`** + **`src/components/bible/BibleReader.tsx`**

The `study_sessions` table already exists with all the needed columns. On "Begin Study":

1. Insert a row via Supabase with: `book_usfm`, `chapter_id`, `verse_start`, `verse_end`, `paper_width_px`, `paper_height_px`, `chars_per_line`, `line_spacing`, `margin_style`, `font_size_px`, `text_x`, `text_y`, `text_width_px`, `elapsed_seconds: 0`, `status: 'active'`, `camera_x/y/scale/rotation` defaults.
2. Return session ID + full config to parent via `onStartSession`.

**File: `src/components/bible/BibleReader.tsx`**: Update the `onStartSession` handler to receive and store the session ID for heartbeat use.

### Phase 3: Session Heartbeat

**File: `src/components/bible/BibleReader.tsx`** or new hook `src/hooks/useStudySessionHeartbeat.ts`

- `useEffect` with 30-second `setInterval` that upserts `study_sessions` row with: `camera_x/y/scale/rotation` from `camera.current` ref (from `PaperCanvasContext`), `elapsed_seconds` computed from `Date.now() - sessionStartTime`, `last_active_at: now()`, `status: 'active'`.
- On unmount: final upsert with `status: 'paused'`. If timed session and elapsed >= target: `status: 'complete'`, `completed_at: now()`.

### Phase 4: Remove CanvasSetupSheet

**File: `src/components/bible/BibleReader.tsx`**

- Replace `CanvasSetupSheet` usage: when `studyModeVariant === "margin"`, also open `CanvasCreationDrawer` instead. Remove import + JSX of `CanvasSetupSheet`.
- **File: `src/components/bible/CanvasSetupSheet.tsx`** — Delete entirely.

### Phase 5: Session Resume Cards

**File: `src/components/bible/BibleSleeveSheet.tsx`** (or a new `SessionCards` component)

Add a "Recent Sessions" horizontal scroll row. Each card (160×200px, rounded-2xl):
- Top: paper texture placeholder with book abbreviation
- Middle: verse range label
- Bottom: clock icon + elapsed time + "Resume" ghost button

On "Resume": load session config from `study_sessions`, re-initialize PaperCanvas with stored camera state, restore ink from annotations.

**New hook: `src/hooks/useStudySessions.ts`** — Fetches user's recent sessions from `study_sessions` table, ordered by `last_active_at desc`.

### Phase 6: Gesture Education Overlay

**New file: `src/components/bible/GestureEducationOverlay.tsx`**

- Show conditions: `study_sessions` count === 0 before first insert, OR dismissal count < 3 (persisted in `localStorage` key `kr_gesture_hints_dismissed`).
- Mounts over PaperCanvas as absolutely positioned layer.
- Segmented control: "Touch & Gestures" | "Apple Pencil"
- **Touch state**: 4 spatial hint cards with inline SVGs (64×64 viewBox, white strokes):
  1. Two-finger pan (directional arrows)
  2. Pinch zoom (spread/pinch)
  3. Three-finger rotate (arc arrow)
  4. Tap a verse (ripple)
- **Apple Pencil state**: 5 hint cards:
  1. Draw to annotate (pencil + ink stroke)
  2. Circle a word (dashed circle)
  3. Underline to highlight (line under text)
  4. Scratch to delete (X stroke)
  5. Squeeze for tools (pencil barrel squeeze) — with "Apple Pencil Pro" amber badge
- Cards: `bg-black/40 backdrop-blur-sm`, white text, 12px, rounded-xl. Framer Motion staggered fade-in.
- Chrome: top bar with wordmark + segmented control + "Got it" ghost button. Bottom bar with "Don't show again" + dot indicator + "Next →".
- "Got it" increments dismiss count. "Don't show again" sets count to 3.
- Radial gradient overlay: transparent center, black/60 edges.
- Exit animation: opacity 0, scale 0.98, 0.25s.

### Phase 7: Persistent Overlay Access

**File: `src/components/bible/iPadStudyToolbar.tsx`**

- Add a `?` icon button (last item, ghost style) that re-shows the gesture overlay.

**File: `src/components/bible/BibleReader.tsx`**

- Add state for `gestureOverlayOpen`, wire it to the toolbar button and auto-show logic.

### Dev Notes

All iPadOS port comments will be added inline per the spec.

### Files Summary

| File | Action |
|------|--------|
| `src/components/bible/CanvasCreationDrawer.tsx` | Major rewrite — new presets, timer, margin style, tabbed mobile, sacred CTA |
| `src/components/bible/CanvasSetupSheet.tsx` | Delete |
| `src/components/bible/BibleReader.tsx` | Replace CanvasSetupSheet with CanvasCreationDrawer, add session ID state, heartbeat wiring, gesture overlay state |
| `src/hooks/useStudySessionHeartbeat.ts` | New — 30s upsert loop for session persistence |
| `src/hooks/useStudySessions.ts` | New — fetch recent sessions for resume cards |
| `src/components/bible/SessionCards.tsx` | New — horizontal scroll session resume cards |
| `src/components/bible/GestureEducationOverlay.tsx` | New — full gesture coach overlay with 2 segments |
| `src/components/bible/iPadStudyToolbar.tsx` | Add "?" help button |
| `src/components/bible/BibleSleeveSheet.tsx` | Import + render SessionCards row |

