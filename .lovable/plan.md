

## Fix Pencil Drawing Offset on Rotated Canvas

### Problem
`getBoundingClientRect()` returns an axis-aligned bounding box that inflates when the element is rotated, causing proportional mapping to produce incorrect coordinates.

### Fix

**File:** `src/components/bible/InkOverlay.tsx` (lines 173-193)

Replace the `getBoundingClientRect` proportional mapping with `getScreenCTM().inverse()`. Now that react-spring has been removed from PaperCanvas (replaced with direct DOM manipulation), the browser's computed transform matrix is always current.

```ts
/* ── Coordinate normalization via getScreenCTM ──
 * With direct DOM transforms (no react-spring), getScreenCTM() always
 * reflects the current transform. Its inverse correctly undoes scale,
 * translate, AND rotation to map screen coords into SVG-local space. */
const getTransformedPoint = useCallback(
  (clientX: number, clientY: number): [number, number] => {
    const svg = svgRef.current;
    if (!svg) return [0, 0];
    const ctm = svg.getScreenCTM();
    if (ctm) {
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const transformed = pt.matrixTransform(ctm.inverse());
      return [transformed.x, transformed.y];
    }
    // Fallback only if CTM unavailable
    const rect = svg.getBoundingClientRect();
    return [clientX - rect.left, clientY - rect.top];
  },
  [],
);
```

The dependency array becomes empty — no external values needed.

| File | Change |
|------|--------|
| `InkOverlay.tsx` | Replace `getBoundingClientRect` mapping with `getScreenCTM().inverse()` |

