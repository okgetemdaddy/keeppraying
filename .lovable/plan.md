
## Problem Analysis

The current tooltip positioning uses `pos.x` (center of badge) and `pos.y` (bottom of badge + scrollY) rendered with `position: fixed`. There are two bugs here:

1. **Wrong coordinate system**: `pos.y = rect.bottom + window.scrollY + 8` adds `scrollY` to a `fixed` position. `position: fixed` coordinates are relative to the **viewport**, not the document. So as the user scrolls, the tooltip drifts off-screen. This is the "cut off when not full screen" bug.

2. **Hover-only desktop, click removes hover intent**: The user wants hover-near-mouse behavior back, with no click needed on desktop.

3. **Mouse tracking**: The user wants the tooltip to follow the mouse (appear near cursor), not anchored to the badge center.

## Fix Plan

**Single file: `src/components/VerseLink.tsx`**

### 1. Track mouse position for tooltip placement
- Add a `mousePos` state `{ x, y }` updated in `handleMouseMove` on the trigger span
- On `handleMouseEnter`, store the current mouse coordinates

### 2. Fix the `position: fixed` coordinate math
- Remove the `+ window.scrollY` from `updatePos` — `fixed` elements use viewport coords, not document coords
- Use mouse event coordinates directly (`e.clientX`, `e.clientY`) for placement so the tooltip appears right next to the cursor

### 3. Smart edge-clamping
- Keep the tooltip within viewport bounds using `window.innerWidth` and `window.innerHeight`
- Tooltip appears to the right of cursor by default (`x + 16`), flips left if near right edge
- Tooltip appears below cursor by default (`y + 16`), flips above if near bottom edge

### 4. Desktop: hover only, no click
- Remove `onClick={handleTap}` handler from the trigger span for desktop (keep `onTouchEnd` for mobile)
- On desktop: open on `mouseenter`, close on `mouseleave` (with the 280ms grace period so users can move into the tooltip)
- Remove `openedByClickRef` — no longer needed on desktop
- Keep click-outside-close for mobile sheet only

### 5. Mobile: unchanged
- Bottom sheet on `onTouchEnd` tap — no changes

```text
Desktop flow (new):
  mouseenter → 300ms delay → open tooltip at cursor pos → fetch summary
  mousemove  → update tooltip position to follow cursor
  mouseleave → 280ms delay → close tooltip
  (no click action)

Mobile flow (unchanged):
  tap → open bottom sheet → fetch summary
  tap X or backdrop → close sheet
```

### Position calculation (new):
```ts
const handleMouseMove = (e: React.MouseEvent) => {
  if (isMobile) return;
  const x = e.clientX;
  const y = e.clientY;
  // Tooltip is 320px wide, 12px offset from cursor
  const left = x + 320 + 16 > window.innerWidth ? x - 320 - 8 : x + 16;
  // Tooltip est. ~140px tall
  const top = y + 140 + 16 > window.innerHeight ? y - 140 - 8 : y + 16;
  setPos({ x: left, y: top });
};
```

The tooltip then uses `left: pos.x, top: pos.y` with **no** `translateX(-50%)` since we're placing it directly at the cursor offset.

This is a clean fix — no new dependencies, no structural changes, just correcting the coordinate math and restoring hover-near-mouse behavior.
