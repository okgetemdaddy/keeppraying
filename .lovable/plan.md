

# Add Edge-Swipe Gestures for Bible Sleeve & Bible Pocket

## Summary

Add two touch-based edge-swipe gestures to `BibleReader.tsx`:
- **Left edge → right swipe**: opens the Bible Sleeve (`setSleeveOpen(true)`)
- **Right edge → left swipe**: opens the Bible Pocket (`setPocketOpen(true)`)

## Changes — Single file: `src/components/bible/BibleReader.tsx`

### Add a `useEffect` with touch event listeners

- **Edge zones**: leftmost 24px for Sleeve, rightmost 24px for Pocket
- **Threshold**: horizontal drag > 60px triggers open
- **Guards**: disabled when `studyMode` is active or `canvasOpen` / `journalOpen` (avoids conflict with ink/drawing gestures)
- **Gated to mobile/touch** via `useIsTouch()` (imported from `use-mobile.tsx`)
- **Passive listeners** to avoid scroll jank

### Gesture logic (pseudocode)

```text
touchstart:
  if clientX < 24        → record as "sleeve-swipe"
  if clientX > width-24  → record as "pocket-swipe"

touchmove:
  track latest clientX

touchend:
  if sleeve-swipe && deltaX > 60  → setSleeveOpen(true)
  if pocket-swipe && deltaX < -60 → setPocketOpen(true)
  reset tracking
```

### No other files changed

Both `BibleSleeveSheet` and `BiblePocketSheet` already accept `open`/`onOpenChange` — we just set `open` to `true` from the gesture. The `useIsTouch` hook already exists in `use-mobile.tsx`.

