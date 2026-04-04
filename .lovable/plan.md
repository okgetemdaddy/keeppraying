

## Fix Zoom/Pan Snap-back Bugs + Move Toolbar Buttons into Nav Overlay

### Bug 1 — Zoom snaps back on finger release

**Root cause**: The `useEffect` on line 126-131 fires whenever `zoom` prop changes. The `notifyZoomChange` function debounces with a 32ms timer, but the `useEffect` compares against `zoomRef.current` which gets set by `notifyZoomChange`. The issue is that when React re-renders after `onZoomChange` updates state, the `useEffect` fires and calls `api.set({ scale: zoom })` — but the spring may have already moved past that value during the debounce window. The real fix: prevent the sync effect from overriding gesture-driven values.

**Fix in `PaperCanvas.tsx`**:
- Add `const gestureActive = useRef(false)` 
- In the touch `onTouchStart` for zoom: set `gestureActive.current = true`
- In `onTouchEnd` / `resetGestureState`: set `gestureActive.current = false`
- In the zoom sync `useEffect`: guard with `if (!gestureActive.current)` so toolbar slider changes still sync, but gesture-driven changes don't get overwritten
- Same for desktop wheel handler: set gestureActive around the scale change

Updated sync effect:
```ts
useEffect(() => {
  if (!gestureActive.current && Math.abs(zoom - zoomRef.current) > 0.001) {
    zoomRef.current = zoom;
    api.set({ scale: zoom });
  }
}, [zoom, api]);
```

### Bug 2 — Pan position resets on zoom

**Analysis**: The current `onTouchEnd` handler does NOT reset x/y/rotation to 0 — it only applies momentum or reverts if dead zone wasn't met. This looks correct. However, the `resetGestureState` is called after every touch end, including zoom gestures. The zoom gesture end doesn't reset spring values, so this should be fine. The real issue is likely that the zoom `useEffect` triggers a React re-render which causes the entire touch effect (line 142-382) to re-mount because `spring.x`, `spring.y`, `spring.rotation`, `spring.scale` are in its dependency array.

**Fix**: Remove `spring.x, spring.y, spring.rotation, spring.scale` from the `useEffect` dependency array. These are spring refs that are read via `.get()` inside the handlers — they don't need to be dependencies. The effect only needs `onZoomChange` and `api`. This prevents the touch listeners from being torn down and re-attached on every spring value change.

Updated dependency array:
```ts
}, [onZoomChange, api]);
```

Wait — that's already what the code has on line 382. Let me re-read... Line 382 shows `[onZoomChange, api, spring.x, spring.y, spring.rotation, spring.scale]`. The spring values ARE in the deps. Removing them is the fix for Bug 2.

### UI Fix — Toolbar buttons in nav overlay

**What to add**: After the version/book/chapter selectors in the nav overlay (after line 2228), add a new row containing all the secondary toolbar buttons:
- Bible Sleeve button
- Study mode toggle  
- Export canvas button
- Focus mode toggle
- Search input
- Text size popover
- Reading mode toggle (verse/paragraph)
- Bible Pocket button

**Approach**: Add a `<div className="flex items-center gap-2 mt-2 pb-1 flex-wrap">` after the selectors row, containing copies of these buttons. Since these are simple stateless UI triggers (they just call setState), duplicating the JSX is simpler than extracting fragments for ~8 buttons that each have different props.

### Files to Edit

| File | Changes |
|------|---------|
| `src/components/bible/PaperCanvas.tsx` | Add `gestureActive` ref, guard zoom sync effect, remove spring values from touch effect deps |
| `src/components/bible/BibleReader.tsx` | Add toolbar buttons row inside the study nav overlay |

