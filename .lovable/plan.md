

## Fix Pencil Coordinate Drift: Replace getScreenCTM with Pure-Math Transform

### Problem
Safari's `getScreenCTM().inverse()` fails with nested CSS 3D rotations due to a WebKit bug. Coordinates drift after rotation.

### Solution
Replace `getScreenCTM().inverse()` with a deterministic pure-math function that manually reverses the CSS transform using the known camera state (x, y, scale, rotation) from PaperCanvas.

### Architecture
Since InkOverlay is passed as a `ReactNode` overlay prop to PaperCanvas, we need a way to share the transform state. We'll use a lightweight React context.

### Changes

**1. New file: `src/components/bible/PaperCanvasContext.tsx`**

Create a small context that holds:
- `camera`: ref to `{ x, y, scale, rotation }`
- `deskRef`: ref to the un-transformed outer container div

```ts
const PaperCanvasContext = React.createContext<{
  camera: React.RefObject<{ x: number; y: number; scale: number; rotation: number }>;
  deskRef: React.RefObject<HTMLDivElement>;
} | null>(null);
```

Export a `usePaperCamera` hook that reads the context.

**2. `src/components/bible/PaperCanvas.tsx`**

Wrap the render output in `<PaperCanvasContext.Provider>` passing `transformState` as `camera` and `deskRef` as `deskRef`. No other changes needed — the transform state and refs already exist.

**3. `src/components/bible/InkOverlay.tsx`**

Replace `getTransformedPoint` (lines 173-194). Instead of `getScreenCTM().inverse()`, use `usePaperCamera()` and compute the inverse transform with pure math:

```ts
const getTransformedPoint = useCallback(
  (clientX: number, clientY: number): [number, number] => {
    const ctx = cameraCtx; // from usePaperCamera()
    if (!ctx?.deskRef.current) {
      // Fallback for non-PaperCanvas usage (ZoomWrapper mode)
      const svg = svgRef.current;
      if (!svg) return [0, 0];
      const rect = svg.getBoundingClientRect();
      return [clientX - rect.left, clientY - rect.top];
    }

    const rect = ctx.deskRef.current.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    // Map screen coords to wrapper-local, centered at origin
    let x = (clientX - rect.left) - cx;
    let y = (clientY - rect.top) - cy;

    // Reverse translate
    x -= ctx.camera.current.x;
    y -= ctx.camera.current.y;

    // Reverse scale
    x /= ctx.camera.current.scale;
    y /= ctx.camera.current.scale;

    // Reverse rotation
    const rad = -ctx.camera.current.rotation * (Math.PI / 180);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const rx = x * cos - y * sin;
    const ry = x * sin + y * cos;

    // Shift back to top-left origin, then to centered SVG viewBox coords
    return [rx, ry]; // Already centered since viewBox origin is at paper center
  },
  [],
);
```

Note: The viewBox is already centered at `(-528, -816)`, so the math output (centered coordinates) maps directly to SVG space without needing a top-left shift.

### Files

| File | Change |
|------|--------|
| `src/components/bible/PaperCanvasContext.tsx` | New — context + hook for camera state sharing |
| `src/components/bible/PaperCanvas.tsx` | Wrap render in context provider |
| `src/components/bible/InkOverlay.tsx` | Replace getScreenCTM with pure-math inverse transform |

