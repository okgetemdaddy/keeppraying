

## Three Fixes: Canvas Unmount, Ink Echo, Drawing Offset

### Fix 1 — Keep PaperCanvas mounted during loading

**File:** `src/components/bible/BibleReader.tsx` (lines 2419-2427)

Move the PaperCanvas rendering OUTSIDE the `AnimatePresence` block. When `studyMode && studyModeVariant === "margin"`, render PaperCanvas unconditionally — put the loading state INSIDE it as children:

```tsx
{studyMode && studyModeVariant === "margin" ? (
  <div
    key={`canvas-${bookUsfm}-${chapterIdx}`}
    style={{ fontSize: `${textSize}px` }}
    className={`bible-reading-canvas font-body ${premiumDark ? 'bible-serif-reading' : ''}`}
  >
    <PaperCanvas
      baseFontSize={textSize}
      textSpacing={inkTextSpacing}
      textAlign={wsTextAlign}
      marginWidth={wsMarginWidth}
      canvasBackground={wsCanvasBackground}
      overlay={/* existing InkOverlay */}
    >
      {isLoading ? (
        <div style={{ padding: 40, opacity: 0.4 }}>Loading...</div>
      ) : (
        <section className={mode === "paragraph" ? "leading-[1.9] text-foreground" : "space-y-3"}>
          {/* existing verse rendering */}
        </section>
      )}
    </PaperCanvas>
  </div>
) : (
  <AnimatePresence mode="wait">
    {isLoading ? (
      <motion.div key="skeleton" {...fadeIn}><ReadingSkeleton /></motion.div>
    ) : hasVerses ? (
      /* existing non-study rendering */
    ) : null}
  </AnimatePresence>
)}
```

Key change: `key` uses only `bookUsfm` and `chapterIdx` — remounts on chapter navigation, stable during saves/mode changes.

### Fix 2 — Guard ink sync against own save echoes

**File:** `src/components/bible/BibleReader.tsx` (lines 966-990)

Add an `inkSaveInFlight` ref. Set it `true` before `saveAnnotationMut.mutate()`, clear on `onSettled`. Skip `replaceStrokes` when the flag is set:

```ts
const inkSaveInFlight = useRef(false);
```

In `scheduleInkSave` (line 982), wrap the mutate call:
```ts
inkSaveInFlight.current = true;
saveAnnotationMut.mutate({
  verseIds: [inkKey],
  strokes: strokesToSave as unknown as StrokeData[],
  existingId: inkAnnotationId,
}, {
  onSettled: () => { inkSaveInFlight.current = false; },
});
```

In the useEffect (line 966):
```ts
useEffect(() => {
  if (inkSaveInFlight.current) return;
  if (inkAnnotation) {
    inkHistory.replaceStrokes((inkAnnotation.strokes as unknown as InkStroke[]) ?? []);
  } else {
    inkHistory.replaceStrokes([]);
  }
}, [inkAnnotation]);
```

### Fix 3 — Replace getScreenCTM with getBoundingClientRect mapping

**File:** `src/components/bible/InkOverlay.tsx` (lines 173-192)

Replace `getTransformedPoint` to use `getBoundingClientRect()` (which always reflects current visual transforms) and map proportionally into SVG viewBox space:

```ts
const getTransformedPoint = useCallback(
  (clientX: number, clientY: number): [number, number] => {
    const svg = svgRef.current;
    if (!svg) return [0, 0];

    const rect = svg.getBoundingClientRect();
    const svgW = canvasWidth ?? rect.width;
    const svgH = canvasHeight ?? rect.height;

    const x = ((clientX - rect.left) / rect.width) * svgW;
    const y = ((clientY - rect.top) / rect.height) * svgH;

    return [x, y];
  },
  [canvasWidth, canvasHeight],
);
```

This works because `getBoundingClientRect()` is computed by the browser layout engine and always includes CSS transforms (scale, translate, rotate) applied by react-spring — unlike `getScreenCTM()` which can return stale values.

### Summary

| File | Change |
|------|--------|
| `BibleReader.tsx` | Move PaperCanvas outside AnimatePresence; add `inkSaveInFlight` guard |
| `InkOverlay.tsx` | Replace `getScreenCTM` with `getBoundingClientRect` proportional mapping |

