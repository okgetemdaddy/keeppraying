

# Unified Study Canvas with Proper Input Separation

## Summary
Fix three fundamental issues in Study Mode: pencil sometimes scrolls instead of drawing, ink overlay doesn't cover margins, and circle/underline gestures don't trigger word-level actions. The solution creates a single unified spatial surface with explicit input routing.

## Technical Changes

### 1. Input Routing — `BibleReader.tsx`

Add two `useEffect` hooks that activate only when `studyMode && studyModeVariant === "margin"`:

**Effect A — Pencil & single-finger scroll prevention:**
- Intercept `touchmove` with `{ passive: false }` — prevent default for single-finger touches (no scroll), allow two-finger touches (native scroll)
- Intercept `pointerdown` — `preventDefault()` for `pointerType === "pen"` to stop scroll container capturing pen events
- Set `touchAction: "none"` and `overscrollBehavior: "none"` on `readingAreaRef.current`
- Clean up styles and listeners on teardown

**Effect B — Manual two-finger scroll:**
- Track `touchstart` with 2 touches → record average Y
- On `touchmove` with 2 touches → compute deltaY, manually adjust `scrollTop`
- Reset on `touchend`

When `studyMode` is OFF, none of this applies — normal scroll and swipe-to-change-chapter work as-is.

### 2. Full-Canvas InkOverlay — `InkOverlay.tsx`

**SVG sizing:** Replace `width="100%" height="100%"` with dynamic dimensions from a `ResizeObserver` on the parent element:
- Track `canvasSize` state `{ width, height }` derived from `parent.scrollWidth` and `parent.scrollHeight`
- Recalculate on chapter load, resize, zoom, and text spacing changes via `ResizeObserver` + dependency array `[zoom]`
- Set `width={canvasSize.width}` `height={canvasSize.height}` `viewBox="0 0 ..."` on the SVG

**Pointer event routing:** The SVG keeps `pointerEvents: "auto"` but the `handlePointerDown` now explicitly calls `e.preventDefault()` and `e.stopPropagation()` for pen events (and finger if `fingerDrawing` is on). All other pointer types pass through to HTML below.

### 3. Word-Level Hit Testing — `BibleReader.tsx` + `InkOverlay.tsx`

**Word wrapping in verse rendering:**
Create a `WordWrappedText` helper that splits text on whitespace boundaries and wraps each word in `<span data-word="..." data-word-index={n} data-verse={verseNumber}>`. These spans are invisible layout-wise (no extra spacing). Used by `HighlightedText` for unhighlighted text segments and for the plain text fallback.

**Enhanced circle detection in `InkOverlay`:**
Add new callback prop: `onWordCircle?: (words: string, verseNumber: number, anchorPoint: { x: number; y: number }) => void`

After detecting a closed loop via `isClosedLoop`, query `document.querySelectorAll('[data-word]')` and check each element's bounding rect center against the convex hull. Based on results:
- 1-4 words from a single verse → fire `onWordCircle` (opens ReferenceBloom with specific words)
- 5+ words or multiple verses → fire existing `onCircleSelect` (verse selection)

**Wire in BibleReader.tsx:**
```
onWordCircle={(words, verseNum, anchor) => {
  setReferenceBloom({ x: anchor.x, y: anchor.y, word: words, verseNumber: verseNum });
}}
```

### 4. Underline Gesture Detection — `InkOverlay.tsx` + `BibleReader.tsx`

**New `isUnderlineGesture` function:**
- Check stroke is roughly horizontal: xRange > 40px and yRange < xRange * 0.3
- At least 5 points

**New callback prop:** `onUnderlineGesture?: (verseNumber: number, underlinedText: string) => void`

In `handlePointerUp`, after circle detection fails, check for underline gesture. If detected:
- Find `[data-word]` elements whose center X falls within the stroke's X range and whose bottom Y is near the stroke's average Y
- Collect the words and verse number
- Fire `onUnderlineGesture` instead of saving as ink
- Trigger haptic feedback via `navigator.vibrate(10)`

**Wire in BibleReader.tsx:**
Handle `onUnderlineGesture` by auto-highlighting with the last-used highlight color via `mutations.addHighlight.mutate(...)` and showing a toast.

### 5. Unchanged Components
- `ZoomWrapper` — no modifications (overlay already spans full grid via `gridColumn: 1 / -1`)
- `ManuscriptCanvas`, `JournalPanel` — no changes
- Chapter navigation, position persistence — no changes
- Reading experience when Study Mode is OFF — no changes

## Files Changed

| File | Change |
|------|--------|
| `src/components/bible/BibleReader.tsx` | Input routing useEffects, WordWrappedText helper, onWordCircle/onUnderlineGesture handlers, integrate into HighlightedText |
| `src/components/bible/InkOverlay.tsx` | Dynamic SVG sizing via ResizeObserver, pointer event separation, word-level circle detection, underline gesture detection, two new callback props |

