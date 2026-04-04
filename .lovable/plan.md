

## Dead Zone for Zoom & Rotation + Remove Debug Panel

### Changes — `src/components/bible/PaperCanvas.tsx`

**1. Zoom dead zone (lines 280-287)**

Wrap the zoom application in a `Math.abs(ratio - 1.0) > 0.008` guard. Move `lastDist = dist` inside the guard so micro-drift doesn't accumulate.

```ts
if (intent === "zoom") {
  const ratio = dist / lastDist;
  if (Math.abs(ratio - 1.0) > 0.008) {
    const currentScale = spring.scale.get();
    const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, currentScale * ratio));
    api.set({ scale: nextScale });
    lastGestureZoom.current = nextScale;
    onZoomChange(nextScale);
    lastDist = dist;
  }
}
```

**2. Move `lastDist` update out of unconditional position (line 305)**

Change line 305 so `lastDist` is only updated inside the zoom dead zone (above) or when intent is not zoom. `lastMidpoint` stays unconditional since pan needs it every frame.

```ts
// line 305 becomes:
if (intent !== "zoom") lastDist = dist;
lastMidpoint = midpoint;
```

**3. Rotation dead zone (lines 310-318)**

Add `Math.abs(dAngle) > 0.3` guard and move `lastAngle3 = angle` inside:

```ts
if (e.touches.length === 3 && gestureType === "rotate") {
  e.preventDefault();
  const angle = getAngleFromTouches3(e.touches);
  let dAngle = angle - lastAngle3;
  if (dAngle > 180) dAngle -= 360;
  if (dAngle < -180) dAngle += 360;
  if (Math.abs(dAngle) > 0.3) {
    api.set({ rotation: spring.rotation.get() + dAngle });
    lastAngle3 = angle;
  }
}
```

**4. Remove debug panel (lines 476-492) and debug tick state/effect**

Delete the `debugTick` state, its `useEffect` interval, and the debug `<div>` from the JSX.

