

## Fix: Remove Pressure Check Blocking Apple Pencil Pro

### Root Cause
The debug overlay confirmed it: Apple Pencil Pro reports `pressure=0` on every `pointerdown` in iPadOS Safari. Real pressure only arrives on the first `pointermove`. The `if (e.pressure === 0) return;` check treats every pen contact as hover and blocks all drawing.

The `/canvas` InkCanvas works because it has no pressure check — it draws on any pen `pointerdown`. The `pointerdown` event itself is proof of contact; hover only fires `pointermove`.

### Changes

**`src/components/bible/InkOverlay.tsx`**

1. **Remove the pressure gate** (line 251): Delete `if (e.pressure === 0) return;` and replace with a comment explaining why there's no pressure check.

2. **Remove the debug overlay**: Delete the `debugLog` state (line 244), all `setDebugLog` calls in `handlePointerDown` and `handlePointerMove`, and the fixed-position debug `<div>` rendered after the SVG.

One-line behavioral fix + cleanup of temporary debug code. No other files affected.

