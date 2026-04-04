

## Fix: Apple Pencil Pro Drawing Blocked by Width/Height Check

### Problem
Line 248 in `InkOverlay.tsx` rejects pen events where `e.width > 20 || e.height > 20`. Apple Pencil Pro reports larger contact dimensions due to its barrel roll sensor, causing all strokes to be silently dropped.

### Fix (one line)

**`src/components/bible/InkOverlay.tsx` — line 248**

Change:
```ts
if (e.pressure < 0.01 || e.width > 20 || e.height > 20) return;
```
To:
```ts
if (e.pressure < 0.01) return;
```

The pressure check alone filters hover events (pressure: 0). The width/height palm-rejection guard is unnecessary for `pointerType === "pen"` — the browser already classifies the input as a pen, not a palm. No other lines need changes; the move handler at line 289 has no width/height filtering.

