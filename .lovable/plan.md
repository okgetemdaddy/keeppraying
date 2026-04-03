

# Annotated Bible Chapter Export & Share System

## What this does
Users can export their annotated Bible chapters (text + ink strokes + margin cards) as PNG images or PDFs, and share them to prayer circles, family rooms, or save as personal study artifacts. The Bible Sleeve gets a 2-column layout to accommodate the growing feature set including a new "My Studies" section.

## Technical changes

### 1. Install dependencies
- `html-to-image` — DOM-to-PNG capture
- `jspdf` — PDF generation from captured image

### 2. Database migration

```sql
-- Study artifacts table
CREATE TABLE public.study_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  book_usfm text NOT NULL,
  chapter_number int NOT NULL,
  version_id int NOT NULL,
  title text NOT NULL,
  image_url text NOT NULL,
  stroke_count int NOT NULL DEFAULT 0,
  card_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.study_artifacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own artifacts"
  ON public.study_artifacts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

Also create a `study-exports` storage bucket (public) for hosting exported images.

### 3. New component: `src/components/bible/CanvasExportSheet.tsx`

Bottom sheet with five actions:
- **Save as Image** — `toPng()` on `readingAreaRef`, triggers browser download
- **Save as PDF** — wraps PNG in jsPDF with chapter title header + "Created with KeepRead.ing" watermark footer
- **Share to Circle** — circle selector via `useAccountabilityCircles`, uploads image to `study-exports` bucket, creates `accountability_circle_prayers` entry with type `bible_study`
- **Share to Family Room** — same pattern via `useFamilyRooms` + `family_room_prayers`
- **Save to My Studies** — uploads image, inserts into `study_artifacts`

Props: `open`, `onOpenChange`, `readingAreaRef`, `bookUsfm`, `chapterNumber`, `chapterTitle`, `versionId`

Preview thumbnail generated on open via `toPng(readingAreaRef.current)`.

### 4. Wire into `BibleReader.tsx`

- Add `exportSheetOpen` state
- Pass `readingAreaRef` to `CanvasExportSheet`
- Pass `onExportCanvas` callback to `BiblePocketSheet`
- Add `Download` icon button to study mode toolbar area (visible when `studyMode` active)

### 5. `BiblePocketSheet.tsx` — Add export trigger

- New prop: `onExportCanvas?: () => void`
- Render "Export Canvas" button in the Notes tab (visible when annotations or strokes exist)

### 6. `BibleSleeveSheet.tsx` — 2-column layout + "My Studies" section

**Layout refactor**: Change the single-column `space-y-5` container to a responsive 2-column grid on wider viewports:
- Left column: Settings sections (Appearance, Text Size, Reading Mode, Display Toggles, Immersive, Study Mode)
- Right column: Content sections (Highlights, Bookmarks, Notes, Bunches, My Studies, Trash Bin)
- On narrow/mobile viewports (< 640px or sheet width < 400px): falls back to single column

Implementation: wrap the existing sections in two `<div>` groups inside a `grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5` container. No structural changes to individual sections — just regrouping.

**New "My Studies" collapsible section** (in right column, before Trash Bin):
- New `SECTION_IDS.studies` entry
- Fetches from `study_artifacts` table for current user
- Each artifact shows: title, small thumbnail, date created
- Tapping navigates to that chapter (calls existing `onNavigateToVerse` pattern)
- New props: `studyArtifacts` array + `onNavigateToArtifact` callback

The sheet width increases from `w-[80vw] sm:w-[360px]` to `w-[85vw] sm:w-[480px] lg:w-[560px]` to accommodate 2 columns.

## Files changed

| File | Change |
|------|--------|
| `src/components/bible/CanvasExportSheet.tsx` | New — export/share bottom sheet |
| `src/components/bible/BibleReader.tsx` | Add export state, render CanvasExportSheet, pass ref + toolbar trigger |
| `src/components/bible/BiblePocketSheet.tsx` | Add `onExportCanvas` prop + button |
| `src/components/bible/BibleSleeveSheet.tsx` | 2-column grid layout + "My Studies" section |
| Migration | `study_artifacts` table + RLS + `study-exports` storage bucket |

