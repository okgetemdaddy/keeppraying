

# Cross-Reference Popover System

## What this does
Users can discover related Bible verses without leaving the current chapter. A popover shows AI-suggested cross-references with verse previews. Accessible via the FloatingToolbar ("Cross-refs" button) or by long-pressing any verse number.

## Technical changes

### 1. New component: `src/components/bible/CrossReferencePopover.tsx`

- Accepts `bookUsfm`, `chapterNumber`, `verseNumber`, `versionId`, `verseText`, `onNavigate`, `open`, `onOpenChange`
- Calls `bible-search` edge function with the verse text as query (prompt already returns cross-references well)
- Uses React Query with key `["cross-refs", bookUsfm, chapterNumber, verseNumber]` and `staleTime: 30 * 60 * 1000`
- Renders a Radix `Popover` with max-height scrollable list (up to 8 results)
- Each result: reference label (EB Garamond), 1-2 line preview fetched via `youversion-proxy`, and a "Go" button calling `onNavigate(bookUsfm, chapter, verse)`
- Preview text fetched lazily per-result using the existing `fetchBible` pattern from `useBibleChapterData`
- Styled with `bg-card border shadow-lg rounded-xl`, dark mode via `bible-dark` variant

### 2. `FloatingToolbar.tsx` — Add "Cross-refs" action button

- Add `onCrossRef?: (verseNumber: number) => void` prop to `FloatingToolbarProps` and `ToolbarActions`
- Add a `BookMarked` icon button in the action buttons section (after "Add Note"), labeled "Cross-refs" in vertical layout
- Calls `onCrossRef(primaryVerse)` then `onDismiss()`

### 3. `BibleReader.tsx` — Wire up cross-ref popover

- Add state: `crossRefVerse: number | null` and `crossRefOpen: boolean`
- Add `handleCrossRef` callback that sets `crossRefVerse` and opens the popover
- Pass `onCrossRef={handleCrossRef}` to `FloatingToolbar`
- Render `CrossReferencePopover` component anchored to `#verse-{crossRefVerse}`, passing current `bookUsfm`, `chapterNumber`, `versionId`, verse text from `verses` array, and `handleSearchNavigate` as `onNavigate`

### 4. `EnrichedVerse` — Long-press on verse number `<sup>`

- Add `onLongPressVerseNumber?: (verseNumber: number) => void` prop to `EnrichedVerseProps`
- On the `<sup>` element containing the verse number, add `onPointerDown` / `onPointerUp` timer pattern (500ms threshold)
- `onPointerDown` starts a timeout; `onPointerUp` / `onPointerLeave` / `onPointerCancel` clears it
- Does NOT use `onContextMenu` (would conflict with Study Mode)
- BibleReader passes `onLongPressVerseNumber={handleCrossRef}` to each `EnrichedVerse`

### 5. Edge function reuse

No changes to `bible-search` edge function — the existing prompt already returns `{ book, chapter, verseStart, label, confidence }` which is exactly what cross-refs need. We just send the verse text as the query.

## Files changed

| File | Change |
|------|--------|
| `src/components/bible/CrossReferencePopover.tsx` | New component — AI cross-refs popover with verse previews |
| `src/components/bible/FloatingToolbar.tsx` | Add `onCrossRef` prop + BookMarked button |
| `src/components/bible/BibleReader.tsx` | Wire state, callbacks, render popover, pass long-press handler |

