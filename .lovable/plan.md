

## Three Changes in Two Files

### 1. Fix underline word detection — `InkOverlay.tsx` (lines 417-450)

Replace the manual `* zoom + svgRect` coordinate conversion with CTM-based transform. The current code manually multiplies SVG coordinates by zoom and adds the SVG element's screen offset, but this disagrees with how `getScreenCTM()` works (which already accounts for all transforms including scroll offset).

**Replace lines 417-450** with:
- Remove the two DEBUG toast lines (419, 442)
- Remove `svgRect` / manual math
- Use `svg.getScreenCTM()` + `svg.createSVGPoint().matrixTransform(ctm)` to convert each stroke point to screen coordinates
- Increase Y tolerance from `rect.height * 0.5` to `rect.height * 0.8`

### 2. Fix verse-linking coordinate conversion — `InkOverlay.tsx` (lines 463-478)

The "Dynamic verse linking" block at lines 470-471 uses the same broken `* zoom + svgRect` math to find the closest verse to a freehand stroke. Apply the same CTM fix here.

### 3. Circle gesture center positioning — `InkOverlay.tsx` (lines 365-366, 376-377, 390-391)

These compute popup center positions for circle-select UI. They use `svgRect.left + (...) * zoom` which has the same issue. Apply CTM transform for consistency.

**Note:** The circle *hit-testing* at lines 345-346 converts screen→SVG (the reverse direction) and is correct — leave it untouched.

### 4. Remove debug toasts — `BibleReader.tsx` (line 2303)

Remove the `toast(\`DEBUG underline: ...\`)` line from the `onUnderlineGesture` callback.

### 5. Two-finger scroll — already done

The `deltaY * 3` multiplier is already in place from the previous edit. No change needed.

### Files
- `src/components/bible/InkOverlay.tsx` — CTM-based coordinate conversion for underline, verse-linking, and circle center; remove debug toasts
- `src/components/bible/BibleReader.tsx` — remove debug toast line

