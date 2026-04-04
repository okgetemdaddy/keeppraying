
Implement the remaining PaperCanvas zoom-loop fix exactly as requested in `src/components/bible/PaperCanvas.tsx`.

1. Remove the fragile gesture-echo guard
- Delete `lastGestureZoom` entirely.
- Remove every assignment/read of it in pinch, touch-end, wheel, and the zoom sync effect.

2. Stop syncing React state during active pinch
- In the 2-finger zoom block, keep the dead zone and spring update, but remove:
  - `lastGestureZoom.current = nextScale`
  - `onZoomChange(nextScale)`
- Keep `lastDist = dist` only when the dead zone is exceeded.

3. Replace the zoom sync effect with a one-shot internal flag
- Add `const internalZoomUpdate = useRef(false)`.
- Replace the current `useEffect` so external zoom changes still update the spring, but the next prop echo from an internal gesture/wheel commit is ignored once:
```ts
useEffect(() => {
  if (!internalZoomUpdate.current) {
    api.set({ scale: zoom });
  }
  internalZoomUpdate.current = false;
}, [zoom, api]);
```

4. Commit pinch zoom only on touch end
- In `onTouchEnd`, keep zoom syncing there as the only touch-based React state update.
- Before `onZoomChange(finalScale)`, set:
```ts
internalZoomUpdate.current = true;
```

5. Apply the same protection to desktop ctrl/cmd+wheel zoom
- Keep wheel zoom updating the spring immediately.
- Before `onZoomChange(nextScale)`, set:
```ts
internalZoomUpdate.current = true;
```

6. Preserve the dead-zone improvements already made
- Keep the `0.008` zoom dead zone.
- Keep the `0.3` rotation dead zone.
- Keep `lastDist` and `lastAngle3` updating only when their respective dead zones are exceeded.

Expected result
- During pinch, the spring becomes the only source of truth for scale.
- React state updates only after the gesture ends.
- External zoom sources (toolbar/other controls) still sync into the spring.
- The feedback loop causing snap-back is removed rather than masked.

Technical note
- `BibleReader.tsx` can stay unchanged: `handleInkZoomChange` still persists zoom, but it will now be called only at gesture end for touch zoom and per event for ctrl/cmd+wheel.
- No InkOverlay changes are needed for this specific fix.
