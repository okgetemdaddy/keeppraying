

# Fix: Two-Finger Scroll in Study Mode + X-Gesture Reliability

## Problems Identified

**1. Two-finger scroll completely broken in study mode**
The manual two-finger scroll handler (lines 965-1002) does `area.scrollTop += deltaY` on `readingAreaRef` — but that div has no `overflow` property and is NOT a scroll container. The page scrolls via `window`. Additionally, `preventSingleFingerScroll` sets `touchAction: "none"` on the area AND prevents all single-finger touchmove, which blocks the browser's native two-finger scroll too since `touchAction: none` disables ALL touch-driven scrolling.

**2. X-gesture detection too strict for natural pencil strokes**
The algorithm requires a cosine angle < -0.3 at the reversal point and both segments spanning 40% of the bbox. Natural X marks with Apple Pencil often have rounded vertices and uneven strokes that fail these thresholds. The detection needs to be more forgiving.

## Changes

### 1. `src/components/bible/BibleReader.tsx` — Fix two-finger scroll target

**Lines 965-1002** — The two-finger scroll handler must scroll `window` (or `document.documentElement`), not `readingAreaRef.current`:

```typescript
// Change: area.scrollTop += deltaY;
// To:     window.scrollBy(0, deltaY);
```

**Lines 940-955** — The `preventSingleFingerScroll` handler must allow two-finger touches to pass through to the manual handler. The `touchAction: "none"` on the area is correct (it forces all touch through JS), but the `touchmove` handler must NOT call `e.preventDefault()` on two-finger touches:

```typescript
const preventSingleFingerScroll = (e: TouchEvent) => {
  // Only block single-finger scroll (pen-like drags)
  // Allow 2-finger scroll to be handled by our manual scroll handler
  if (e.touches.length < 2) {
    e.preventDefault();
  }
  // Don't preventDefault for 2-finger — let our manual handler process it
};
```

Wait — actually the issue is that the `touchmove` listener with `{ passive: false }` calls `preventDefault` only for single-finger, which is correct. But `touchAction: "none"` on the element tells the browser to never scroll, even for two-finger. The manual scroll handler listens on the SAME element, so two-finger `touchmove` events should fire. The real bug is that `area.scrollTop` doesn't scroll because the div isn't scrollable.

**Fix**: Change the two-finger scroll to use `window.scrollBy(0, deltaY)` instead of `area.scrollTop += deltaY`.

### 2. `src/components/bible/InkOverlay.tsx` — Relax X-gesture detection

Loosen the thresholds to catch more natural X marks:
- Reduce minimum size from 30px to 20px
- Relax aspect ratio from 3:1 to 4:1
- Relax cosine threshold from -0.3 to -0.15 (angle > ~99°)
- Reduce segment span requirement from 40% to 30%

### 3. `src/components/bible/BibleReader.tsx` — Fix X-gesture SVG selector

The selector `".absolute.inset-0.z-10"` is fragile. Use a ref or data attribute instead. Pass the InkOverlay SVG ref via a callback, or more simply, use `readingAreaRef.current?.querySelector("svg")` since there's only one SVG in the reading area.

## Files Changed

| File | Change |
|------|--------|
| `src/components/bible/BibleReader.tsx` | Fix two-finger scroll to use `window.scrollBy`; fix SVG selector to use a stable query |
| `src/components/bible/InkOverlay.tsx` | Relax X-gesture thresholds for natural pencil strokes |

