

# Handwritten Verse Annotations with Apple Pencil Support

## Overview

Add a `HandwritingEngine` component using `perfect-freehand`, a Supabase `annotations` table, and integrate "iPad Study Mode" (Mode 1: Adaptive Marginalia) into the Bible reader. Users can handwrite notes in the margin alongside verses, with full Apple Pencil pressure/tilt support and PencilKit-compatible JSON export.

## Step 1: Install `perfect-freehand`

Add `perfect-freehand` to `package.json` dependencies.

## Step 2: Create `HandwritingEngine.tsx`

Create `src/components/bible/HandwritingEngine.tsx` with the user-provided code (adapted: remove `'use client'` directive since this is a Vite project, not Next.js). The component:
- Uses an SVG canvas with pointer events for drawing
- Captures `pressure`, `tiltX`, `tiltY`, `twist` from Apple Pencil
- Stores strokes as `StrokeData[]` (JSON-serializable, PencilKit-compatible)
- Supports `variant` prop: `margin` | `infinite` | `journal`
- Includes a floating toolbar with color picker, size slider, undo, clear
- Detects `pointerType === "pen"` and shows a Pencil indicator
- Exposes `ref` handle: `clear()`, `undo()`, `getStrokes()`, `getSVG()`, `exportForPencilKit()`

## Step 3: Create `annotations` table (migration)

```sql
create table public.annotations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null,
  verse_ids text[] not null,
  strokes jsonb not null,
  svg text,
  tags text[],
  folder text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.annotations enable row level security;

create policy "Users manage own annotations"
  on public.annotations for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

No foreign key to `auth.users` per project guidelines.

## Step 4: Create `useAnnotations` hook

New file `src/hooks/useAnnotations.ts`:
- `useVerseAnnotations(verseId: string)` — fetches annotations where `verse_ids` contains the verse
- `saveAnnotation(verseIds, strokes)` — upserts to the `annotations` table
- `deleteAnnotation(id)` — removes an annotation
- Uses React Query with `queryKey: ["annotations", verseId]`

## Step 5: Integrate Mode 1 (Adaptive Marginalia) into BibleReader

### In `BibleReader.tsx`:
- Add `studyMode` state (boolean), persisted to localStorage `bible_study_mode`
- Auto-detect: if any `pointerdown` event has `pointerType === "pen"`, auto-enable study mode with a toast
- Add a Pencil/PenTool icon button in toolbar Row 2 to toggle study mode manually
- When `studyMode` is true:
  - Increase line-height on the verse section to `leading-[2.8]`
  - Pass `studyMode` prop to `EnrichedVerse`

### In `EnrichedVerse` (within BibleReader.tsx):
- When `studyMode` is true, render a `HandwritingEngine` overlay (variant="margin", showToolbar=false, height ~60px) below each verse
- The overlay is positioned as a margin annotation area with subtle dashed border
- On stroke completion (`onSave`), save to `annotations` table with `verse_ids: ["{BOOK}.{CH}.{VERSE}"]`
- If a verse already has annotations, show a small handwriting icon (✍️) next to the verse number; tapping it reveals the strokes

### Annotation indicator:
- For verses with saved annotations, show a tiny pen icon next to the verse number
- Tapping the icon opens a small inline preview of the strokes (read-only SVG render)
- Long-press or tap edit button to re-enter drawing mode for that verse

## Step 6: Add Study Mode toggle to Bible Sleeve

In `BibleSleeveSheet.tsx`, add a new collapsible section "iPad Study Mode" with:
- Toggle to enable/disable study mode
- Brief description: "Write directly on the page with Apple Pencil or finger"
- Show Apple Pencil status indicator when detected

## Files Changed

1. `package.json` — add `perfect-freehand`
2. `src/components/bible/HandwritingEngine.tsx` — new component (user-provided code, adapted)
3. Database migration — `annotations` table + RLS
4. `src/hooks/useAnnotations.ts` — new hook for CRUD
5. `src/components/bible/BibleReader.tsx` — study mode state, auto-detect pencil, toolbar button, pass to EnrichedVerse, annotation overlay per verse
6. `src/components/bible/BibleSleeveSheet.tsx` — study mode toggle in sleeve

## Technical Notes

- `'use client'` directive will be removed (Vite, not Next.js)
- Strokes stored as JSONB in Supabase, directly compatible with future PencilKit import
- SVG viewBox will use the actual rendered width of each verse margin area via `getBoundingClientRect`
- `touch-action: none` on the SVG prevents scroll interference during drawing
- Text remains selectable — the annotation overlay only captures pen/touch events on the SVG, not on the text layer
- Modes 2 (Infinite Canvas) and 3 (Journal) are stubbed in the component but not wired into the reader UI yet — they'll be added after Mode 1 is validated

