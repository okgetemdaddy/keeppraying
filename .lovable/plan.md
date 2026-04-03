

# Fix: Full-Screen Ink Drawing Surface in Study Mode

## Problem
The reading area container has `max-w-3xl mx-auto` (768px max-width, centered), leaving ~30% of screen width on each side as dead zones with no InkOverlay coverage. When the Apple Pencil touches these outer areas, no SVG captures the pointer events, so the browser falls back to scroll/selection behavior. Drawing only works if you start inside the text area and drag outward (because `setPointerCapture` keeps the existing stroke alive).

## Solution
In study mode, expand the `readingAreaRef` container to fill the full viewport width so the ZoomWrapper's grid (text + margins) and the InkOverlay SVG span edge-to-edge. The text column stays centered via the CSS Grid columns, but the ink surface covers the entire screen.

## Changes

### 1. `src/components/bible/BibleReader.tsx` — Expand reading area in study mode

On the `readingAreaRef` div (line ~2162), conditionally remove `max-w-3xl` and adjust padding when study mode is active:

```tsx
// Currently:
<div ref={readingAreaRef} className="relative mx-auto max-w-3xl px-5 sm:px-8 py-8 sm:py-12">

// Change to:
<div ref={readingAreaRef} className={`relative py-8 sm:py-12 ${
  studyMode && studyModeVariant === "margin"
    ? "w-full px-0"           // full width, no padding — grid handles spacing
    : "mx-auto max-w-3xl px-5 sm:px-8"  // original constrained layout
}`}>
```

### 2. `src/components/bible/ZoomWrapper.tsx` — Ensure grid fills viewport

When the margin system is active, the CSS Grid already provides text vs margin columns. We need to ensure the text column has a max-width equivalent to `max-w-3xl` so readability is preserved while the margins extend to screen edges.

Update the `gridTemplateColumns` calculation to use `minmax()` so the text column caps at ~768px and extra space flows into the margins:

```tsx
// For left-align: text column capped, right margin gets remaining space
// "minmax(0, 768px) 1fr" instead of "1fr 30%"
```

This gives us: `[text: max 768px] [margin: rest of screen]` — the ink overlay (absolute inset-0 spanning grid column 1/-1) now covers the entire viewport width.

### 3. `src/components/bible/InkOverlay.tsx` — No changes needed

The SVG already uses `absolute inset-0` with a ResizeObserver on its parent. Once the parent spans the full viewport, the SVG will automatically resize to match.

### 4. Study mode scroll prevention — No changes needed

The `touchAction: "none"` and `preventSingleFingerScroll` listeners are already attached to `readingAreaRef`, so expanding its width means the entire screen surface will have scroll prevention active.

## Files Changed

| File | Change |
|------|--------|
| `src/components/bible/BibleReader.tsx` | Conditionally remove `max-w-3xl mx-auto` and padding in study mode |
| `src/components/bible/ZoomWrapper.tsx` | Update grid columns to use `minmax()` so text stays readable while margins extend to edges |

