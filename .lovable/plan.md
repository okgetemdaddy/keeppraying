

# X-Gesture to Delete Highlights & Ink Strokes

## Summary
Add an "X mark" gesture detector to InkOverlay. When a user draws an X shape with the Apple Pencil, the system identifies what's beneath the X's bounding box — highlighted verses and/or ink strokes — and deletes them (with trash bin support). The larger the X, the larger the deletion area.

## Technical Changes

### 1. `src/components/bible/InkOverlay.tsx` — X gesture detection + new callback

**Add `isXGesture` detection function** (alongside existing `isUnderlineGesture` and `isClosedLoop`):
- Analyze the stroke points to find two roughly diagonal crossing lines
- Algorithm: split points into first-half and second-half segments. Check if each segment has a strong diagonal (aspect ratio near 1:1, not too flat/tall). Check if the two segments' bounding boxes overlap significantly (the crossing point). Check that X/Y ranges are both > 30px minimum
- Return the bounding box of the X as the deletion area

**Add new callback prop:**
```typescript
onXGesture?: (bbox: { minX: number; minY: number; maxX: number; maxY: number }) => void;
```

**Wire into `handlePointerUp`** — insert X detection AFTER circle detection but BEFORE underline detection. If X gesture is detected:
- Flash a brief red "×" animation at the center of the X (CSS keyframe, auto-removes after 400ms)
- Call `onXGesture` with the bounding box (in screen coordinates, accounting for zoom and SVG offset)
- Do NOT persist the X stroke (return early, don't call `onStrokeComplete`)
- Haptic feedback: `navigator.vibrate([30, 50, 30])` (double-tap pattern)

### 2. `src/components/bible/BibleReader.tsx` — Handle X gesture

**Add handler function `handleXGesture`:**
- Receives the screen-coordinate bounding box from InkOverlay
- **Delete highlights**: Query all `[data-verse]` elements. For each verse element whose bounding rect intersects the X bbox, check `highlightMap` for highlights on that verse. Call `mutations.removeHighlight.mutate(id)` for each found highlight (this already snapshots to trash_bin)
- **Delete ink strokes**: Iterate `inkHistory.strokes`. For each stroke, compute its bounding box from its points (adjusting for zoom + SVG offset). If the stroke bbox intersects the X bbox, collect its ID. Remove matching strokes via a new `removeStrokes` method on inkHistory
- Show toast: `"Removed N highlight(s) and M stroke(s)"` (only mentioning non-zero counts)

**Wire to InkOverlay:**
```tsx
onXGesture={(bbox) => handleXGesture(bbox)}
```

### 3. `src/hooks/useInkHistory.ts` — Add `removeStrokes` method

Add a new method that removes specific strokes by ID and moves them to the ink trash bin:

```typescript
const removeStrokes = useCallback((strokeIds: string[]) => {
  setStrokes((prev) => {
    const removed = prev.filter((s) => strokeIds.includes(s.id));
    const remaining = prev.filter((s) => !strokeIds.includes(s.id));
    if (removed.length > 0) {
      pushUndo(prev);
      setTrashBin((bin) => [
        ...bin,
        { id: `trash-${Date.now()}`, strokes: removed, clearedAt: new Date() },
      ]);
    }
    return remaining;
  });
}, [pushUndo]);
```

Return it from the hook.

### 4. X Gesture Detection Algorithm

```text
function isXGesture(points):
  if points.length < 8: return false
  
  bbox = computeBoundingBox(points)
  xRange = bbox.maxX - bbox.minX
  yRange = bbox.maxY - bbox.minY
  
  # Must be big enough and roughly square-ish
  if xRange < 30 or yRange < 30: return false
  if xRange / yRange > 3 or yRange / xRange > 3: return false
  
  # Find direction changes (the vertex of the X)
  # Split stroke at the point where direction reverses most sharply
  # Check that we have two diagonal segments crossing
  
  midIdx = floor(points.length / 2)
  seg1 = points[0..midIdx]
  seg2 = points[midIdx..end]
  
  # Each segment should span most of the bbox
  seg1xRange / xRange > 0.5 AND seg1yRange / yRange > 0.5
  seg2xRange / xRange > 0.5 AND seg2yRange / yRange > 0.5
  
  return true  # with bbox
```

## Files Changed

| File | Change |
|------|--------|
| `src/components/bible/InkOverlay.tsx` | Add `isXGesture` detector, `onXGesture` prop, red flash animation, wire into `handlePointerUp` |
| `src/hooks/useInkHistory.ts` | Add `removeStrokes(ids)` method with trash bin support |
| `src/components/bible/BibleReader.tsx` | Add `handleXGesture` handler, wire to InkOverlay's `onXGesture` prop |

