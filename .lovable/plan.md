

# ProMotion Ink Smoothing + Overflow Fix + Native Bridge Scaffold

## Overview

Four changes to upgrade the InkOverlay from 60Hz web-standard to 120Hz "hardware ink," fix margin clipping, add stroke compression for database efficiency, and scaffold the native PencilKit bridge.

**Important note on pressure sensitivity:** The system **already supports pressure-sensitive strokes** — `perfect-freehand` receives `[x, y, pressure]` with `simulatePressure: false`. Lines already get thicker/thinner based on Apple Pencil force. No changes needed there.

---

## Changes

### 1. `src/components/bible/InkOverlay.tsx` — Coalesced Events + Overflow

**`handlePointerMove` (lines 276-283):** Replace the single point push with a coalesced events loop:

```typescript
const coalesced = (e.nativeEvent as PointerEvent).getCoalescedEvents?.() ?? [e.nativeEvent];
for (const ce of coalesced) {
  const [cx, cy] = getTransformedPoint(ce.clientX, ce.clientY);
  pointsBufferRef.current.push({
    x: cx, y: cy,
    pressure: ce.pressure ?? 0.5,
    tiltX: ce.tiltX, tiltY: ce.tiltY,
  });
}
```

This captures 2-4× more curve data per frame on iPad Pro ProMotion displays, eliminating polygonal jaggedness.

**`handlePointerUp` (lines 344-354):** Add a Ramer-Douglas-Peucker simplification step before saving the stroke. Install `simplify-js` and run it with tolerance 0.5 on the finalized points to reduce point count by ~50-70% without losing handwritten character. This prevents database bloat from the increased coalesced point density.

**SVG element (line 453-457):** Add `overflow: "visible"` to the style object so strokes extending into margins aren't clipped.

### 2. `src/components/bible/ZoomWrapper.tsx` — Study Mode Touch Suppression

Add a `studyMode?: boolean` prop. When true, set `touchAction: "none"` instead of `"pan-y"` (line 82). This tells the browser to stop intercepting scroll gestures during active drawing — the "secret sauce" that eliminates micro-stutter.

Also add `overflow-visible` to the text column div (line 101) so ink that starts on text and extends into margins isn't clipped by the container.

### 3. `src/components/bible/BibleReader.tsx` — Pass `studyMode` to ZoomWrapper

Pass the existing `studyMode` state as a prop to the `ZoomWrapper` component at line 1871.

### 4. `src/hooks/useNativePencil.ts` — Native Bridge Scaffold (New File)

A service hook that detects Capacitor native environments and provides a `syncViewport` method to broadcast scroll position + zoom scale to a native PencilKit layer via `window.webkit.messageHandlers.pencilBridge`. When `isNativeMode` is true, the web InkOverlay should defer to the native canvas. No runtime behavior change yet — this is the architectural seam for future Capacitor compilation.

---

## Dependencies

Install `simplify-js` (tiny, zero-dependency library) for the stroke compression step.

## Files Changed

| File | Change |
|------|--------|
| `src/components/bible/InkOverlay.tsx` | Coalesced events loop, stroke simplification before save, `overflow: visible` on SVG |
| `src/components/bible/ZoomWrapper.tsx` | Add `studyMode` prop for `touch-action: none`, `overflow-visible` on text column |
| `src/components/bible/BibleReader.tsx` | Pass `studyMode` prop to `ZoomWrapper` |
| `src/hooks/useNativePencil.ts` | New hook — native bridge scaffold with viewport sync |
| `package.json` | Add `simplify-js` dependency |

