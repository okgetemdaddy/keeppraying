

## Build: Book Annotations Hook, Chapter Thumbnail Drawer, SVG Text Layout (exists), Help Page

### Critical Schema Discovery

The `annotations` table uses `verse_ids` (string array) and `strokes` (JSON), NOT a `key`/`content` schema. The `useBookAnnotations` hook must query by `verse_ids` array prefix matching. The existing annotation hooks (e.g., `useChapterInkAnnotations`) filter client-side after fetching all user annotations.

Also: `svgTextLayout.ts` already exists with the full implementation (`layoutBibleText`, `SvgTextLayoutConfig`, `SvgWordElement`, etc.) and is already imported in `BibleReader.tsx` at line 134. No changes needed there.

### File 1: `src/hooks/useBookAnnotations.ts` (Create)

Eagerly prefetch all annotations for the current book on mount. Adapted to the actual schema:

- Query `annotations` table for the user, fetch all rows, then client-side filter by `verse_ids` entries starting with `{bookUsfm}.`
- Group by chapter number extracted from verse ID patterns (e.g., `GEN.1.ink` → chapter 1, `GEN.3.1` → chapter 3)
- Extract `MinimapStroke` data from the `strokes` array (which contains `StrokeData[]` with point arrays)
- Convert stroke point arrays to SVG path data strings for the minimap
- Expose `chapterAnnotations: Map<number, ChapterAnnotationData>`, `isLoading`, and `invalidateChapter()`
- `invalidateChapter` re-fetches only the relevant chapter's annotations
- iPadOS comment per spec

### File 2: `src/components/bible/ChapterThumbnailStrip.tsx` (Rewrite)

Replace the basic 5-chapter strip with a full drawer:

- Keep same component name and file path for backward compatibility
- Extend props interface to accept optional `chapterAnnotations` map
- Framer Motion spring slide-down animation (`type: "spring"`, stiffness 300, damping 30)
- Dark styling: `bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-800`
- Horizontal scroll container with `scroll-snap-type: x mandatory`, auto-scroll to current chapter on open via `scrollIntoView`
- Each card (~120px wide, ~1:1.4 aspect): chapter number, minimap SVG via `generateChapterMinimap` from `src/lib/minimap.ts` with `dangerouslySetInnerHTML`, relative time for `lastEditedAt`, amber ring for current chapter
- Empty state: ghosted text lines at 10% opacity + "Not yet studied" label
- Full-book empty state: centered muted message
- Memoize minimap SVG per card with `useMemo`
- iPadOS `UICollectionView` comment

### File 3: `src/components/bible/BibleReader.tsx` (Edit)

Three changes:

1. **Import and call `useBookAnnotations`** with `bookUsfm`, pass `chapterAnnotations` to `ChapterThumbnailStrip`
2. **Add bouncing chevron trigger** below the chapter heading (after the version subtitle, ~line 3094-3104), hidden during canvas sessions. Uses `motion.button` with `animate={{ y: [0, 4, 0] }}` infinite loop
3. **Wire `invalidateChapter`** — call after annotation saves with 1.5s debounce (add a `useRef` + `setTimeout` pattern near the annotation save handlers)

### File 4: `src/lib/svgTextLayout.ts` — No changes needed

Already exists with complete implementation: `layoutBibleText`, offscreen canvas measurement, superscript verse numbers, word-level bounding boxes. Already imported in BibleReader.

### File 5: Font barrier in BibleReader.tsx (Edit)

Add the `document.fonts.load()` + `Promise.race` with 3s timeout before `layoutBibleText` calls. Locate the session start handler where `layoutBibleText` is invoked and wrap with the async font barrier. iPadOS comment per spec.

### File 6: Help page

- Create `src/pages/Help.tsx` with sessions explainer, gesture guide, and Apple Pencil sections
- Uses `KeepReadingNav` for keepread.ing domain consistency
- Add route `/help` to both `App.tsx` (main router, line ~213 area) and `KeepReadingShell.tsx`
- Update `SessionCards.tsx` "What are sessions?" links (lines 55 and 140) to navigate to `/help#sessions` instead of `/support#sessions`

### Summary

| File | Action |
|------|--------|
| `src/hooks/useBookAnnotations.ts` | Create — eager book-wide annotation prefetch |
| `src/components/bible/ChapterThumbnailStrip.tsx` | Rewrite — full drawer with minimap cards |
| `src/components/bible/BibleReader.tsx` | Edit — wire hook, bouncing arrow, invalidation, font barrier |
| `src/lib/svgTextLayout.ts` | None — already complete |
| `src/pages/Help.tsx` | Create — sessions + gestures help page |
| `src/App.tsx` | Edit — add `/help` route |
| `src/components/keepreading/KeepReadingShell.tsx` | Edit — add `/help` route |
| `src/components/bible/SessionCards.tsx` | Edit — update "What are sessions?" link target |

