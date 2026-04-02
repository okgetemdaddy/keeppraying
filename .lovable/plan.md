

# iPad Study Mode — Full SVG Overlay Upgrade

## Summary

Replace the current per-verse 60px `HandwritingEngine` canvases with a single full-page SVG overlay (`InkOverlay`) that turns the entire Bible reading area into a pressure-sensitive, vector-based writable surface. iPad-only features: Apple Pencil with palm rejection, custom zoom (1x–5x), text-spacing slider, dynamic verse linking, and debounced auto-save.

## Architecture

```text
BibleReader
└── ZoomWrapper (CSS transform: scale(zoom))
    ├── Verses (.verse[data-verse="N"])  ← existing
    └── InkOverlay (absolute <svg>, pen-only pointer events)
iPadStudyToolbar (floating bottom bar — pen color/size, eraser, undo, zoom, spacing)
```

## Implementation Steps

### 1. Install `perfect-freehand` (already a dependency — confirmed in HandwritingEngine)

### 2. Create `src/components/bible/InkOverlay.tsx`
- Full-size absolute `<svg>` overlay over the verse container
- Pointer Events filtered: `pointerType === 'pen'` only (optional finger toggle)
- Enhanced palm rejection: `isPencilActive` state, contact-size filter (`e.width > 20`), pressure floor (`e.pressure < 0.01`), global touch suppression while pencil is down, `onPointerCancel` cleanup
- Uses `perfect-freehand` `getStroke()` with `simulatePressure: false` for real Apple Pencil pressure
- Coordinates normalized by `1/zoom` for storage — strokes stay sharp at any scale
- Dynamic verse linking on `pointerup`: compute stroke bounding box → find nearest `.verse[data-verse]` via `getBoundingClientRect()` overlap
- Tap-to-select stroke → highlight + unlink option
- Renders committed strokes + live preview path

### 3. Create `src/components/bible/ZoomWrapper.tsx`
- Wraps verse container + InkOverlay
- CSS `transform: scale(zoom)` with `transform-origin: top left`
- `touch-action: pan-y` to prevent browser pinch-zoom while allowing scroll
- Accepts `zoom` prop from parent

### 4. Create `src/components/bible/iPadStudyToolbar.tsx`
- Floating bottom toolbar (iPad only, above tab bar)
- Controls: pen color picker (5 colors), pen size slider, eraser toggle, undo button
- Zoom slider (1x–5x) with label
- Text spacing slider: sets CSS variable `--verse-spacing` controlling `line-height` and `padding-block` on verses
- Compact pill design, semi-transparent backdrop

### 5. Modify `src/components/bible/BibleReader.tsx`
- Add state: `inkZoom` (1–5), `textSpacing` (1–3), `inkStrokes` (chapter-level)
- When `studyMode && studyModeVariant === "margin"` (rename to "ink" or keep "margin"):
  - Remove per-verse 60px `HandwritingEngine` canvases
  - Render `ZoomWrapper` around verse container with `InkOverlay` inside
  - Render `iPadStudyToolbar`
- Wire auto-save: on stroke complete → debounced 500ms upsert to annotations table with verse_ids `["{book}.{chapter}.ink"]`
- Load chapter ink on mount via new `useChapterInkAnnotations` query
- Keep read-only preview of old per-verse annotations for backward compat (small SVG thumbnail)

### 6. Modify `src/hooks/useAnnotations.ts`
- Add `useChapterInkAnnotations(bookUsfm, chapterNumber)` — fetches annotation where `verse_ids` contains `{book}.{chapter}.ink`
- Add `useInkAutoSave()` hook: debounced 500ms mutation that upserts the single chapter-level ink annotation record
- Existing per-verse annotation queries remain unchanged (backward compat)

### 7. Modify `src/components/bible/BibleSleeveSheet.tsx`
- In the study mode section, add text spacing slider (iPad only)
- Update "Marginalia" description to reflect full-page overlay ("Write anywhere on the page")
- Keep Canvas and Journal modes as-is

### 8. Database Migration
- Add `typed_text` column to annotations table (already in plan.md, needed for Journal):
```sql
ALTER TABLE public.annotations ADD COLUMN IF NOT EXISTS typed_text text;
```
- No other schema changes — existing `strokes` JSONB + `verse_ids` text array handles chapter-level ink via the `.ink` suffix convention

### 9. Update Project Memory
- Record new iPad SVG overlay architecture, palm rejection approach, zoom/spacing features, `.ink` key convention

## Key Technical Decisions
- **SVG overlay** not per-verse canvases — vectors crisp at any zoom, strokes span verses
- **Pen-only + palm rejection** — `pointerType === 'pen'` guard + contact-size filter + global touch suppression while pencil active + `onPointerCancel` cleanup
- **Coordinate normalization** — divide by zoom on capture, multiply on render
- **Single annotation per chapter** — keyed as `{BOOK}.{CHAPTER}.ink` in `verse_ids`
- **No viewport meta lock** — use CSS `touch-action` instead (preserves accessibility)
- **iPad-only gating** — `navigator.maxTouchPoints >= 2 && /iPad|Macintosh/.test(navigator.userAgent)`

## Files

| File | Action |
|------|--------|
| `src/components/bible/InkOverlay.tsx` | **Create** |
| `src/components/bible/ZoomWrapper.tsx` | **Create** |
| `src/components/bible/iPadStudyToolbar.tsx` | **Create** |
| `src/components/bible/BibleReader.tsx` | **Modify** — integrate overlay, remove per-verse canvases in study mode |
| `src/hooks/useAnnotations.ts` | **Modify** — add chapter ink queries + auto-save |
| `src/components/bible/BibleSleeveSheet.tsx` | **Modify** — add text spacing slider |
| Migration | Add `typed_text` column to `annotations` |
| Project memory | Update handwritten-annotations entry |

