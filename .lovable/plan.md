

## Fix: Testimony Back Face Blank + Front Text Bleeding

### Root Cause

**Bug 1 — Back face blank in fullscreen:** The flip container uses `flex-1 min-h-0 flex flex-col` and the front face is also `flex-1 min-h-0 flex flex-col`. The back face (line 487) uses `absolute inset-0`, which should work — but the flip container's `flex flex-col` combined with `min-h-0` causes it to collapse when the front face content is minimal. The back face inherits zero height.

**Bug 2 — Front text bleeds through on flip in compact/layered:** `backfaceVisibility: hidden` is unreliable across browsers when combined with `perspective` and `preserve-3d`. The front face only sets `pointerEvents: "none"` when flipped but remains visually rendered, causing text bleed.

### Fix (single file: `PrayerCardMobile.tsx`)

**1. Front face: add explicit visual hiding when flipped**
Add `opacity: 0` and `visibility: "hidden"` to the front face style when `flipped === true`. This guarantees the front text cannot bleed through regardless of browser 3D rendering quirks.

**2. Flip container: remove `flex flex-col` from the motion.div**
The flip container should be `relative w-full` with explicit height handling, not a flex column. In fullscreen, use `flex-1 min-h-0` only (no `flex flex-col`). Both faces should be positioned to fill the container — front face via `absolute inset-0` in addition to the back face already using it.

**3. Both faces use `absolute inset-0`**
Make the front face also `absolute inset-0` in all variants, and give the flip container a fixed aspect-ratio (9:16) in non-fullscreen mode or `flex-1` in fullscreen mode. This ensures both faces always have identical dimensions.

**4. Back face in fullscreen: add `h-full` to TestifyBack wrapper**
Ensure the back face container passes full height down so `TestifyBack` can render its content.

### Changes

| Line Range | What Changes |
|---|---|
| ~254 | Flip container: `relative w-full ${isFullscreen ? "flex-1 min-h-0" : "aspect-[9/16]"}` — remove `flex flex-col` |
| ~258-268 | Front face: add `absolute inset-0` positioning, add `opacity` and `visibility` transitions based on `flipped` state |
| ~487-503 | Back face: ensure `h-full` on inner wrapper, keep `absolute inset-0` |

### No other files change. No database migrations.

