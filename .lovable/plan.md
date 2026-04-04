

## Fix Pencil Coordinate Drift After Rotation

### Problem
The SVG viewBox origin (0,0 at top-left) doesn't match the paper's CSS rotation pivot (center center = 528, 816). When `getScreenCTM().inverse()` maps screen coordinates, the rotation pivot mismatch causes progressive coordinate drift at non-zero rotation angles.

### Fix

**File:** `src/components/bible/InkOverlay.tsx`

**Line 619** — Change the viewBox to center the coordinate origin:

```tsx
viewBox={canvasWidth && canvasHeight 
  ? `${-canvasWidth/2} ${-canvasHeight/2} ${canvasWidth} ${canvasHeight}` 
  : undefined}
```

This sets the origin to (-528, -816), placing SVG coordinate (0,0) at the paper's center — matching the CSS `transformOrigin: center center`. Now `getScreenCTM().inverse()` correctly accounts for rotation at any angle.

No other changes needed — `getTransformedPoint` already uses `getScreenCTM().inverse()` which will automatically produce coordinates in the new centered space. All stroke points, hover cursor, and gesture hit-testing will work in the new coordinate system. No migration needed for existing strokes since this is a fresh canvas system.

| File | Line | Change |
|------|------|--------|
| `InkOverlay.tsx` | 619 | Center viewBox origin at paper midpoint |

