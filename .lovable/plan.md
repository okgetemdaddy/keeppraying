

# Fix: iPad Pinch-to-Zoom + Pan Sensitivity

## Problem
Safari on iPad intercepts two-finger pinch via its proprietary `gesturestart`/`gesturechange` events before `@use-gesture`'s `onPinch` ever fires. The pinch handler never runs on iPad.

## Changes — Single file: `src/components/bible/canvas/ZoomPanWrapper.tsx`

### 1. Add Safari gesture suppression `useEffect`
Add `useEffect` (import it) that attaches `gesturestart` and `gesturechange` listeners to `containerRef.current` with `e.preventDefault()` and `{ passive: false }`. This kills Safari's native pinch zoom so `@use-gesture` receives the events.

### 2. Increase pinch sensitivity
Line 68: Change `d * 0.5` → `d * 1.0` so font size changes feel proportional to finger spread.

### 3. Increase scroll-to-pan multiplier
Line 85: Change `spring.y.get() - dy` → `spring.y.get() - dy * 2.5` so panning covers more ground per scroll.

### 4. Confirm `touchAction: "none"` is set
Already present on line 118 — no change needed. This prevents the browser from claiming touch gestures.

## Summary of edits

| Line | Current | New |
|------|---------|-----|
| 1 | `import React, { useRef }` | `import React, { useRef, useEffect }` |
| 49 (after spring init) | — | Add Safari gesture suppression `useEffect` block |
| 68 | `d * 0.5` | `d * 1.0` |
| 85 | `spring.y.get() - dy` | `spring.y.get() - dy * 2.5` |

