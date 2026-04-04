

## Replace react-spring with Direct DOM Manipulation + Fix Ink Save Echo

### Problem
React-spring's `useSpring` re-targets to initial values (x:0, y:0, scale:1, rotation:0) on every React re-render. Pencil strokes trigger state changes → re-render → spring animates back to origin.

### Fix 1 — Remove react-spring from PaperCanvas

**File:** `src/components/bible/PaperCanvas.tsx`

Replace the entire spring system with plain refs and direct DOM writes:

1. **Imports:** Remove `useSpring, animated, to` from `@react-spring/web`. Keep `useGesture` from `@use-gesture/react`.

2. **Replace spring state** (lines 98-116) with:
```ts
const paperRef = useRef<HTMLDivElement>(null);
const transformState = useRef({ x: 0, y: 0, scale: 1, rotation: 0 });

const applyTransform = () => {
  const el = paperRef.current;
  if (!el) return;
  const { x, y, scale, rotation } = transformState.current;
  el.style.transform = `translate3d(calc(-50% + ${x}px), calc(-50% + ${y}px), 0) rotate(${rotation}deg) scale(${scale})`;
};
```

3. **Touch handlers** (lines 122-250): Replace all `spring.scale.get()` / `spring.x.get()` / `api.set()` / `api.stop()` with `transformState.current` reads/writes + `applyTransform()`.

4. **Desktop wheel handler** (lines 253-272): Same — read/write `transformState.current`, call `applyTransform()`.

5. **Render** (lines 293-346): Replace `<animated.div style={{transform: to(...)...}}>` with `<div ref={paperRef} style={{...static styles, transform: initial value...}}>`. Remove the dynamic `transform` from the style object — it will be set imperatively.

6. **Delete** `committedScale`, `committedRotation`, `committedX`, `committedY` refs and `SPRING_CONFIG` constant — no longer needed.

### Fix 2 — Ink save echo guard with content comparison

**File:** `src/components/bible/BibleReader.tsx` (lines 966-974)

Replace the `inkSaveInFlight` ref approach with a stroke-count comparison:

```ts
useEffect(() => {
  if (inkAnnotation) {
    const incoming = (inkAnnotation.strokes as unknown as InkStroke[]) ?? [];
    if (incoming.length === inkHistory.strokes.length) return;
    inkHistory.replaceStrokes(incoming);
  } else {
    if (inkHistory.strokes.length === 0) return;
    inkHistory.replaceStrokes([]);
  }
}, [inkAnnotation]);
```

Delete `inkSaveInFlight` ref (line 966), remove the `inkSaveInFlight.current = true` and `onSettled` callback from `scheduleInkSave` (lines 984, 990).

### Summary

| File | Change |
|------|--------|
| `PaperCanvas.tsx` | Remove react-spring; use refs + direct DOM writes for transform |
| `BibleReader.tsx` | Replace `inkSaveInFlight` with stroke-count comparison guard |

