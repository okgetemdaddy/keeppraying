

## Three Fixes: Zoom Snap-back, Ink Offset, Remove Snap Button

### Fix 1 — Zoom snap-back (`PaperCanvas.tsx`)

**Root cause**: Line 166 uses `api.start({ scale: zoom })` which creates a spring animation. When the gesture ends and `onZoomChange` updates React state, this effect fires and potentially animates to a slightly different value or overshoots due to spring physics. The `gestureActive` guard with `requestAnimationFrame` is a race condition.

**Fix**: Replace the `gestureActive` ref approach with a `lastGestureZoom` ref that tracks the last value set by a gesture. The sync effect compares against this ref — if the incoming `zoom` prop matches what the gesture just set, the effect is a no-op. Use `api.set` (instant) instead of `api.start` (animated).

- Remove `gestureActive` ref (line 147)
- Remove `requestAnimationFrame` wrapper in `onTouchEnd` (lines 353-355)
- Remove the `notifyZoomChange` debounce timer and function (lines 171-175) — call `onZoomChange` directly
- Add `const lastGestureZoom = useRef(zoom)`
- Replace zoom sync effect (lines 164-168):
  ```ts
  useEffect(() => {
    if (Math.abs(zoom - lastGestureZoom.current) > 0.001) {
      api.set({ scale: zoom });
    }
  }, [zoom, api]);
  ```
- In pinch handler (line 286-287): set `lastGestureZoom.current = nextScale` before calling `onZoomChange(nextScale)` directly
- In zoom touchend (line 341): call `onZoomChange(spring.scale.get())` and set `lastGestureZoom.current = spring.scale.get()`
- In desktop wheel zoom (lines 385-387): set `lastGestureZoom.current = nextScale` and call `onZoomChange(nextScale)` directly

### Fix 2 — Ink offset when zoomed (`InkOverlay.tsx`)

**Root cause**: The SVG uses `width="100%" height="100%"` with no `viewBox`. When react-spring applies scale transforms to the parent, `getScreenCTM()` should account for it, but forcing a layout recalc before reading CTM ensures accuracy.

**Changes**:
- Add `canvasWidth` and `canvasHeight` optional props to `InkOverlayProps`
- Set SVG `width`, `height`, and `viewBox` from these props (fall back to `100%` / no viewBox)
- In `getTransformedPoint`, call `svg.getBoundingClientRect()` before `svg.getScreenCTM()` to force layout recalc

**In BibleReader.tsx**: Pass `canvasWidth={1056}` and `canvasHeight={1632}` to the InkOverlay rendered inside PaperCanvas.

### Fix 3 — Remove snap-to-center button (`PaperCanvas.tsx`)

Delete the `<button>` element at lines 484-515. Keep `SNAPBACK_CONFIG` since momentum pan uses it (line 228).

### Files to edit

| File | Changes |
|------|---------|
| `src/components/bible/PaperCanvas.tsx` | Replace zoom sync mechanism, remove snap button |
| `src/components/bible/InkOverlay.tsx` | Add canvas dimension props, force CTM recalc |
| `src/components/bible/BibleReader.tsx` | Pass `canvasWidth`/`canvasHeight` to InkOverlay |

