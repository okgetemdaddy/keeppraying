

## Fix: Underline Gesture Not Reaching BibleReader Callback

### Problem

The debug toast in `onUnderlineGesture` never fires, meaning InkOverlay's gesture detection pipeline never calls the callback. The "Failed to highlight" message the user sees comes from a different code path (likely the mutation error handler from a regular highlight attempt).

Two possible failure points in InkOverlay.tsx (lines 416-443):

1. **`isUnderlineGesture()` returns false** — the stroke doesn't pass the shape check (xRange < 40 or yRange > xRange * 0.3)
2. **Word hit-test finds no words** — even if the gesture is recognized, the `[data-word]` element scan at line 432 uses `Math.abs(avgY - elBottom) < rect.height * 0.5`, which may be too restrictive with zoom applied

Since we can't tell which is failing without visibility, the fix is to add diagnostic toasts inside InkOverlay itself.

### Changes — `src/components/bible/InkOverlay.tsx`

**Add debug toasts at the gesture detection stage** (around line 415-443):

```ts
/* ── Underline gesture detection ── */
const underlineDetected = isUnderlineGesture(currentPoints);
toast(`DEBUG gesture: underline=${underlineDetected} points=${currentPoints.length}`);

if (onUnderlineGesture && underlineDetected && svgRef.current) {
  // ... existing word scan code ...
  
  toast(`DEBUG words found: ${underlinedWords.length} verse=${underlinedVerse} text="${underlinedWords.join(' ').slice(0,30)}"`);
  
  if (underlinedWords.length > 0 && underlinedVerse > 0) {
    onUnderlineGesture(underlinedVerse, underlinedWords.join(" "));
    // ...
  }
}
```

This will reveal:
- Whether `isUnderlineGesture` recognizes the stroke shape
- Whether `[data-word]` elements are being found within the Y threshold
- What verse/text data is being collected

**One file edit**: `src/components/bible/InkOverlay.tsx` — add two `toast()` calls inside the gesture detection block, importing `toast` from sonner at the top.

