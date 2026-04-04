

## Fix: Apple Pencil Pro Drawing on /bible Study Mode

Three targeted edits to strip event gates that block Apple Pencil Pro, matching the simpler approach used by /canvas's InkCanvas.

### Changes

**1. `src/components/bible/BibleReader.tsx` — Remove `preventPenScroll` listener (lines 946-950, 953, 959)**

Remove the `preventPenScroll` function and its `addEventListener`/`removeEventListener` calls. Keep `preventSingleFingerScroll` intact. The parent-level `preventDefault` on pen pointerdown fires before InkOverlay receives the event, breaking the pointer capture chain on Apple Pencil Pro. InkOverlay already handles its own `preventDefault`.

**2. `src/components/bible/InkOverlay.tsx` — Simplify pressure check (line 248)**

Change:
```ts
if (e.pressure < 0.01) return;
```
To:
```ts
if (e.pressure === 0) return;
```

Apple Pencil Pro can report initial pressure very close to zero on light contact. Hover events always report exactly `0`.

**3. `src/components/bible/InkOverlay.tsx` — Remove button check (line 267)**

Remove:
```ts
if (e.button !== 0) return;
```

Apple Pencil Pro's squeeze gesture reports non-zero button values. The `pointerType` check already gates input correctly.

