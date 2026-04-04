

## Strip Zoom Feedback Loop & Pan Momentum from PaperCanvas

Two root causes, two fixes: (1) zoom snaps to 1.0 because the sync `useEffect` re-fires and resets the spring, (2) pan flicks because momentum captures messy finger-lift velocity.

### Fix 1 — Remove ALL React state from zoom in PaperCanvas

**PaperCanvas.tsx:**
- Delete `zoom` and `onZoomChange` from `PaperCanvasProps` interface and destructured props
- Delete `internalZoomUpdate` ref (line 147)
- Delete the zoom sync `useEffect` (lines 163-169)
- Change spring init from `scale: zoom` to `scale: 1` (line 153)
- Change `committedScale` init from `useRef(zoom)` to `useRef(1)` (line 141)
- In `onTouchEnd`, delete the zoom-to-React-state sync block (lines 335-340)
- In desktop wheel handler, delete `internalZoomUpdate.current = true` and `onZoomChange(nextScale)` (lines 376-377)
- Remove `onZoomChange` from touch useEffect deps: change `[onZoomChange, api]` to `[api]` (line 364)

### Fix 2 — Remove pan momentum entirely

**PaperCanvas.tsx:**
- Delete constants: `SNAPBACK_CONFIG`, `VELOCITY_BUFFER_SIZE`, `MAX_VELOCITY`, `MIN_VELOCITY`, `MOMENTUM_FACTOR`, `GRACE_MS`, `BOUNDARY_FRACTION`, `OVERSCROLL_RESISTANCE`
- Delete `rubberBand` helper function (lines 26-50)
- Delete `clampVelocity` helper (lines 99-100)
- Delete `velocityBuffer`, `graceTimer`, `clearGrace`, `applyPanMomentum` from inside the touch useEffect
- Replace pan block in `onTouchMove` with raw position update (no rubber-banding):
```ts
if (intent === "pan") {
  const dx = midpoint.x - lastMidpoint.x;
  const dy = midpoint.y - lastMidpoint.y;
  api.set({
    x: spring.x.get() + dx,
    y: spring.y.get() + dy,
  });
}
```
- Replace `onTouchEnd` with minimal reset (no momentum, no grace timer):
```ts
const onTouchEnd = () => {
  gestureType = "none";
  intent = "none";
  accumulatedPan = 0;
  accumulatedZoom = 0;
};
```
- In desktop wheel handler, remove rubber-banding from vertical scroll — use simple `api.set({ y: ... })` instead of `api.start` with snapback config

### Fix 3 — Remove zoom slider from toolbars

**iPadStudyToolbar.tsx:**
- Delete the zoom slider section from the secondary row (ZoomIn icon, Slider, percentage display — lines 320-331)
- Remove `zoom` and `onZoomChange` from the component's props interface

**MobileStudyToolbar.tsx:**
- Delete the zoom section (lines 267-282)
- Remove `zoom` and `onZoomChange` from the component's props interface

**BibleReader.tsx:**
- Remove `zoom={inkZoom}` and `onZoomChange={handleInkZoomChange}` from `<PaperCanvas>` render (line 2432-2433)
- Remove `zoom={inkZoom}` and `onZoomChange={handleInkZoomChange}` from `<IPadStudyToolbar>` render (lines 2931-2932)
- Remove `zoom={inkZoom}` and `onZoomChange={handleInkZoomChange}` from `<MobileStudyToolbar>` render (lines 2962-2963)
- Keep `inkZoom` state and `handleInkZoomChange` — `InkOverlay` still uses them (line 2441)

### Result after changes

The gesture system becomes dead simple:
- 2-finger pinch → `api.set({ scale })` directly, no React state
- 2-finger pan → `api.set({ x, y })` directly, no momentum
- 3-finger rotate → `api.set({ rotation })` directly
- Finger lift → nothing happens, canvas stays put
- No useEffect syncing zoom. No velocity buffers. No grace periods. No rubber-banding.

| File | Changes |
|------|---------|
| `src/components/bible/PaperCanvas.tsx` | Remove zoom props, sync effect, internalZoomUpdate, momentum system, rubber-banding |
| `src/components/bible/iPadStudyToolbar.tsx` | Remove zoom slider and zoom/onZoomChange props |
| `src/components/bible/MobileStudyToolbar.tsx` | Remove zoom slider and zoom/onZoomChange props |
| `src/components/bible/BibleReader.tsx` | Remove zoom/onZoomChange from PaperCanvas & toolbar renders |

