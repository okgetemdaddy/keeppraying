

## Fix Two Study Mode Bugs

### Bug 1 — Two-finger scroll barely moves

**Root cause**: `touchAction: "none"` suppresses native gesture tracking, reducing touchmove event frequency. The manual JS scroll handler was a workaround but can't match native performance.

**Fix in `BibleReader.tsx`**:
- In the "Study Mode input routing" useEffect (lines 934-955): change `area.style.touchAction = "none"` to `area.style.touchAction = "pan-y"`, and remove the `preventSingleFingerScroll` handler and its event listener entirely (single-finger blocking is already handled by InkOverlay's SVG capture).
- Delete the entire "Manual two-finger scroll in Study Mode" useEffect (lines 957-994). With `pan-y`, the browser handles vertical scrolling natively at full speed with momentum.

### Bug 2 — Underline gesture fails to find words

**Root cause**: The Y comparison `Math.abs(avgY - elBottom) < rect.height * 0.8` is too restrictive. An underline stroke sits below the text, and the average Y of stroke points can be well below `elBottom`.

**Fix in `InkOverlay.tsx`** (around line 460-467): Replace the Y check with a range-based comparison:

```ts
const elMidY = rect.top + rect.height / 2;
const elBottomPlusSlack = rect.bottom + rect.height;

if (elCenterX >= startX && elCenterX <= endX && avgY >= elMidY && avgY <= elBottomPlusSlack) {
```

This catches underlines from mid-text to one full line height below — covering natural handwriting variation.

### Files
- `src/components/bible/BibleReader.tsx` — simplify study mode input routing, remove manual scroll handler
- `src/components/bible/InkOverlay.tsx` — fix underline Y-axis hit-test range

