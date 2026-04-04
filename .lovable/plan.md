
Goal
- Fix the remaining snap-back by making the spring state survive React re-renders.
- Move rotation back to 3 fingers, with 2 fingers handling only pan/zoom intent locking.

Implementation
1. `src/components/bible/PaperCanvas.tsx` — make the spring authoritative
- Keep `committedX`, `committedY`, `committedScale`, `committedRotation`, and `gestureActive`.
- Initialize the spring once, then continuously mirror `x/y/scale/rotation` into those refs via spring `onChange` callbacks so the refs always shadow the live spring.
- Replace the current prop sync with a single `useEffect(() => { if (!gestureActive.current) api.start({ scale: zoom }) }, [zoom])`.
- Remove any other prop-driven writes that can overwrite the live spring during re-renders.

2. Rework touch input
- Single finger: no transform gesture handling.
- Two fingers: intent locking between only `pan` and `zoom`.
  - Zoom locks when finger-distance change exceeds 15px.
  - Pan locks when midpoint movement exceeds 12px.
  - Remove rotation entirely from the 2-finger path.
- Three fingers: rotation only.
  - Add a `getAngleFromTouches3()` helper using the first and third touches.
  - On 3-finger move, update only `rotation` with `api.set`.

3. Fix release behavior
- On touch start, set `gestureActive.current = true`.
- On touch move, use `api.set` only for live gesture updates.
- On touch end:
  - Never reset `x`, `y`, `scale`, or `rotation`.
  - Keep pan momentum only for 2-finger pan, using the existing velocity cap and grace period.
  - For zoom, commit the final value with `onZoomChange(spring.scale.get())`.
  - Clear `gestureActive` inside `requestAnimationFrame` after release so the React update from `onZoomChange` cannot immediately overwrite the spring with a stale prop.
  - For 3-finger rotation, stop in place with no momentum.

4. Preserve explicit reset + existing desktop behavior
- Keep the snap-to-center button as the only code path that resets to `x:0, y:0, rotation:0, scale:1`.
- Keep desktop wheel behavior as-is; just let the new spring-shadow ref model handle persistence instead of manual commit timing.

Technical details
- File to edit: `src/components/bible/PaperCanvas.tsx`
- No `BibleReader` changes are needed in this pass; the nav overlay controls are already present.
- Success criteria:
  - Pan/zoom/rotation no longer jump back after finger lift.
  - 2-finger interaction feels stable because it only decides between pan and zoom.
  - 3-finger rotation works independently and stays where released.
  - Toolbar slider still updates zoom correctly.
