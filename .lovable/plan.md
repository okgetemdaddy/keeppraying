

## Rework PaperCanvas to 2-Finger Intent-Locked Gestures

### Summary

Replace the current 2-finger zoom + 3-finger pan system with a unified 2-finger gesture system using dominant intent locking (like Apple Maps/Photos). Single finger does nothing on the desk surface.

### Changes — `src/components/bible/PaperCanvas.tsx`

**1. Add committed value refs** (after line 125):
```ts
const committedScale = useRef(zoom);
const committedRotation = useRef(0);
const committedX = useRef(0);
const committedY = useRef(0);
```

Update spring initializer to use refs. Update the zoom sync `useEffect` to compare against `committedScale.current`.

**2. Replace the entire touch gesture effect** (lines 144-388):

Delete all 3-finger code (`getMidpoint3`, `getAngle3`, `gestureFingerCount`, the `=== 3` branches). Replace with a unified 2-finger system:

- **Helpers**: `getTouchDist` (keep), add `getTouchAngle` (2-finger), `getTouchMidpoint` (2-finger)
- **Intent locking state**: `intent: 'none' | 'pan' | 'zoom' | 'rotate'`, plus `accumulatedPan/Zoom/Rotation` counters and `initialDist/Angle/Midpoint`
- **Thresholds**: zoom > 15px dist delta, rotate > 8° angle delta, pan > 12px midpoint delta

**touchstart (2 fingers)**:
- Set `gestureActive.current = true`
- Record `initialDist`, `initialAngle`, `initialMidpoint`
- Reset intent and accumulators
- Stop any active spring animation

**touchmove (2 fingers)** — intent locking:
- Accumulate deltas for each axis
- Lock intent when first threshold is crossed
- Execute only the locked intent:
  - **zoom**: `api.set({ scale })` + `notifyZoomChange`
  - **pan**: `api.set({ x, y })` with rubber-banding
  - **rotate**: `api.set({ rotation })`
- Update `lastDist/lastAngle/lastMidpoint` for next frame
- Buffer velocity for pan momentum

**touchend**:
- Commit all spring values to refs (`committedX/Y/Rotation/Scale`)
- For pan intent: apply momentum with grace period (keep existing momentum logic)
- For zoom/rotate: just stop, no momentum
- Sync zoom to React: `onZoomChange(committedScale.current)` if zoom changed
- Reset gesture tracking state, set `gestureActive.current = false`

**3. Update snap-to-center button** (line 498-502):
- Reset all committed refs to 0/1
- Call `onZoomChange(1)`

**4. Update desktop wheel handler** (lines 390-417):
- Set `gestureActive.current = true` during zoom changes, update `committedScale.current`
- Update `committedY.current` during vertical pan

### Intent locking thresholds

| Intent | Threshold | Rationale |
|--------|-----------|-----------|
| Zoom | 15px finger distance change | Matches Apple's pinch sensitivity |
| Rotate | 8° angle change | Prevents accidental rotation during pan |
| Pan | 12px midpoint movement | Slightly above dead zone, quick lock |

### What stays the same
- Rubber-banding helpers
- Spring configs
- MarginCanvas component
- Paper dimensions and styling
- Desktop wheel handlers (minor ref updates)
- Snap-to-center button (minor ref updates)

### Files to edit

| File | Change |
|------|--------|
| `src/components/bible/PaperCanvas.tsx` | Full gesture system rewrite |

