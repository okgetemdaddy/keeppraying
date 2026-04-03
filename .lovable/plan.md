

# Word-Boundary Snapping for Bible Highlights

## What this does
When a user drags to highlight text in the Bible reader, their selection will automatically snap to complete words instead of cutting off mid-word. A soft preview highlight appears before they pick a color. Touch devices (iPad) get the same behavior.

## Technical changes

### 1. `BibleReader.tsx` — Add `snapToWordBoundaries` helper + apply in `handleMouseUp`

Add a utility function (outside the component or at top of the effect):

```typescript
function snapToWordBoundaries(text: string, start: number, end: number) {
  while (start > 0 && /\w/.test(text[start - 1])) start--;
  while (end < text.length && /\w/.test(text[end])) end++;
  return { start, end };
}
```

In the `handleMouseUp` listener (line 1329-1338), after computing `textStart` and `selectedText.length`, snap before calling `setPartialSelection`:

```typescript
const rawStart = Math.max(textStart, 0);
const rawEnd = rawStart + selectedText.length;
const snapped = snapToWordBoundaries(textContent, rawStart, rawEnd);
setPartialSelection({ verseNumber: startVerse, start: snapped.start, end: snapped.end });
```

### 2. `BibleReader.tsx` — Add `touchend` listener alongside `mouseup`

In the same `useEffect` (line 1309-1372), register a `touchend` handler that reuses the identical `getVerseFromNode` + snap logic. Both listeners share the same handler function; clean up both on unmount.

### 3. `HighlightedText` — Add `previewRange` prop

Add optional `previewRange?: { start: number; end: number }` to the component's props. When set and no existing highlight covers that range, insert an additional span with `bg-primary/10 rounded-sm` styling into the rendered parts array — using the same cursor/span-splitting logic already in place.

### 4. `EnrichedVerse` — Thread `previewRange` through (props only)

Add `previewRange` to `EnrichedVerseProps` and pass it to `HighlightedText`. No structural changes to the component.

### 5. Verse render loop — Compute and pass `previewRange`

In the `verses.map()` loop (line 1985), compute `previewRange` from `partialSelection` state:

```typescript
previewRange={partialSelection?.verseNumber === v.number
  ? { start: partialSelection.start, end: partialSelection.end }
  : undefined}
```

## Files changed

| File | Change |
|------|--------|
| `src/components/bible/BibleReader.tsx` | `snapToWordBoundaries` helper; apply in `handleMouseUp`; add `touchend` listener; add `previewRange` prop to `HighlightedText` and `EnrichedVerseProps`; pass `partialSelection` as preview in render loop |

