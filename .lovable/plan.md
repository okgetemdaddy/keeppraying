

# Finger-Count Gesture Separation + Loading State

## Overview

Replace the current mixed gesture system with strict finger-count routing: 2 fingers = zoom only, 3 fingers = pan only, 1 finger = ink or nothing. Remove `onDrag` from `useGesture` entirely — keep only `onWheel` for desktop. Add a calm loading state to CanvasBibleReader.

## Changes

### 1. `src/components/bible/canvas/ZoomPanWrapper.tsx` — Full gesture rewrite

**Remove from `useGesture`:** `onDrag` handler and `drag` config block. Keep only `onWheel`.

**Replace raw touch handlers** in the `useEffect` with finger-count logic:

- **Tracking state:** `gestureType: 'none' | 'zoom' | 'pan'`, `lastDist`, `lastMidpoint`, velocity history buffer (last 3-4 frames with timestamps)
- **touchstart:**
  - 2 fingers → set `gestureType = 'zoom'`, record initial distance
  - 3 fingers → set `gestureType = 'pan'`, record midpoint of all 3, call `api.stop()` to halt any active momentum
- **touchmove:**
  - `gestureType === 'zoom'` AND `touches.length === 2` → compute distance delta, map to fontSize (`fontSizeRef.current + delta * 0.15`), clamp 14–72, call `onFontSizeChange`. No translation.
  - `gestureType === 'pan'` AND `touches.length === 3` → compute new midpoint of all 3 fingers, apply delta to `spring.x`/`spring.y` via `api.set()` (immediate, no animation). Push frame to velocity buffer with timestamp.
  - All other counts → ignore
- **touchend / touchcancel:**
  - If `gestureType === 'pan'` → calculate velocity from last 3-4 frames, call `api.start({ x: ..., y: ... })` with the momentum config (tension: 170, friction: 26) to fling
  - Reset all tracking: `gestureType = 'none'`, `lastDist = null`, `lastMidpoint = null`, clear velocity buffer

**Velocity calculation:** Store `{ x, y, t }` for last 4 touchmove frames. On release, compute `vx = (last.x - earlier.x) / (last.t - earlier.t)` and scale by a momentum factor (~150) to project the fling destination.

**Keep:** Safari gesture suppression (`gesturestart`/`gesturechange` preventDefault), `touchAction: "none"`, `onWheel` for desktop (ctrl+scroll = zoom, plain scroll = pan).

### 2. `src/components/bible/canvas/CanvasBibleReader.tsx` — Loading state

- Add `const [ready, setReady] = useState(false)`
- Add `useEffect(() => { const t = setTimeout(() => setReady(true), 300); return () => clearTimeout(t); }, [])`
- Wrap the canvas + HUD + hint in a container with `opacity: ready ? 1 : 0` and `transition: opacity 400ms ease-in`
- Add a loading message visible when `!ready`: centered on parchment background, EB Garamond, 16px, color `#8b7355`, text "Full power canvas initializing...", with its own fade-in (CSS animation, `@keyframes fadeIn` from opacity 0→1 over 600ms)
- HUD and hint share the same opacity gate as the canvas

### 3. Update hint text

Change top-right hint to reflect new gestures:
```
pinch to zoom text · three fingers to pan
ctrl+scroll for semantic zoom
```

## Gesture map summary

```text
Input                          → Action
─────────────────────────────────────────
Apple Pencil / Pen tip         → Ink stroke (InkCanvas pointer events)
1 finger (draw mode on)        → Ink stroke (InkCanvas pointer events)
1 finger (normal)              → Nothing
2 fingers                      → Semantic zoom ONLY
3 fingers                      → Pan with momentum ONLY
Ctrl/Cmd + scroll (desktop)    → Semantic zoom
Scroll wheel (desktop)         → Vertical pan
```

## Files modified

- `src/components/bible/canvas/ZoomPanWrapper.tsx`
- `src/components/bible/canvas/CanvasBibleReader.tsx`

