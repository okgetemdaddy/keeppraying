

# Pan Physics Refinement — ZoomPanWrapper.tsx

## What changes

Four improvements to 3-finger pan behavior: hard velocity cap, finger-lift grace period, boundary rubber-banding, and micro-movement dead zone.

## Implementation details

All changes are in `src/components/bible/canvas/ZoomPanWrapper.tsx`.

### Constants to add/change

```text
MAX_VELOCITY:  1500 → 400  (px/s)
MOMENTUM_FACTOR: 150 → 100  (reduce projection distance to match lower cap)
+ GRACE_MS = 180
+ DEAD_ZONE_PX = 8
+ MIN_VELOCITY = 50  (below this, zero momentum)
+ BOUNDARY_FRACTION = 0.6  (content can be at most 60% off-screen)
+ OVERSCROLL_RESISTANCE = 0.3
+ SNAPBACK_CONFIG = { tension: 120, friction: 20 }
```

### 1. Hard velocity cap — trivial

Change `MAX_VELOCITY` from 1500 to 400. The existing `clampVelocity` helper already enforces it.

### 2. Grace period on finger lift

Add tracking state: `graceTimer: ReturnType<typeof setTimeout> | null`, `graceVx/graceVy` for stored clean velocity, `inGracePeriod: boolean`.

**On `touchend`/`touchcancel` when `gestureType === "pan"`:**
- Freeze canvas at current position (`api.set()`, no animation)
- Calculate smoothed velocity from buffer, store as `graceVx`/`graceVy`
- Set `inGracePeriod = true`, start 180ms timer
- After 180ms: if no new 3-finger gesture started, apply momentum (if velocity > 50px/s and < 400px/s cap), then clear grace state

**During grace period:**
- `onTouchStart`: if 3 fingers arrive, cancel grace timer, resume pan normally
- `onTouchMove` / `onTouchStart` with < 3 fingers: ignore entirely (sloppy lift contacts)

### 3. Boundary rubber-banding

Add a `clampToBounds` helper that takes `(x, y)` and the viewport dimensions (`window.innerWidth`, `window.innerHeight`):
- Compute content bounds: the animated div is at least `100vw × 100vh`. Max allowed offset = `±viewport * BOUNDARY_FRACTION` in each direction.
- Returns `{ x, y, clamped: boolean }` — if past bounds, returns the edge position.

**During active pan (`api.set` in touchmove):**
- After computing new `x/y`, check if past boundary. If so, apply resistance: `edge + (overshoot * OVERSCROLL_RESISTANCE)`.

**During momentum (`api.start` in grace callback):**
- Compute projected target. If past boundary, redirect target to edge position using `SNAPBACK_CONFIG` instead of `SPRING_CONFIG`.

**Desktop wheel pan** also gets the same boundary check — clamp the `api.start` target for `y`.

### 4. Dead zone for micro-movements

Track `totalMovement` (cumulative absolute px moved during a 3-finger gesture). Accumulate `Math.abs(dx) + Math.abs(dy)` on each touchmove frame.

On gesture end: if `totalMovement < DEAD_ZONE_PX` (8px), skip momentum entirely and reset position to where the gesture started (undo any micro-drift).

### Cleanup

- Clear `graceTimer` in the effect's cleanup function to prevent leaks.
- Reset `totalMovement` on touchstart alongside other state.

## Files modified

- `src/components/bible/canvas/ZoomPanWrapper.tsx`

