

## Dual-Toolbar System Integration

Drop in the 9 uploaded files (2 hooks + 5 toolbar components + barrel index) and wire them into BibleReader, InkOverlay, and MarginAnnotationLayer per the integration guide.

### Prerequisites

- Install `zustand` (not currently in package.json)

### New Files (Copy from uploads)

| File | Source |
|------|--------|
| `src/hooks/usePencilTools.ts` | Zustand store — tool type, brush style, color, size, opacity, squeeze menu state |
| `src/hooks/useApplePencilSqueeze.ts` | Squeeze (button=5 / bitmask 32) and double-tap detection hooks |
| `src/components/bible/toolbar/index.ts` | Barrel exports |
| `src/components/bible/toolbar/StudioToolbar.tsx` | Draggable floating palette for canvas sessions |
| `src/components/bible/toolbar/GhostToolbar.tsx` | Auto-collapsing bottom pill for margin reading |
| `src/components/bible/toolbar/SqueezeRadialMenu.tsx` | Radial tool picker at squeeze position |
| `src/components/bible/toolbar/BentoExpansionPanel.tsx` | Brush grid + sliders popover |
| `src/components/bible/toolbar/InkFilterDefs.tsx` | 5 SVG brush texture filters (fountain/technical/wash/marker/highlighter) |

### Integration: `BibleReader.tsx`

1. **Remove inline ink state** (lines 809-818): `inkPenColor`, `inkPenSize`, `inkPenGlow`, `inkFingerDrawing`, and `handleInkPenGlowChange`. Replace with `const pencilTools = usePencilTools()` — destructure `color`, `size`, `opacity`, `activeTool`.

2. **Add squeeze + double-tap hooks** near other hook calls:
   ```tsx
   useApplePencilSqueeze((x, y) => pencilTools.toggleSqueezeMenu(x, y));
   useApplePencilDoubleTap(() => pencilTools.toggleLastTool());
   ```

3. **Replace `<IPadStudyToolbar>` block** (lines 3785-3814) with:
   ```tsx
   <InkFilterDefs standalone />
   <SqueezeRadialMenu />
   {isInPaperCanvas && activeSessionConfig && (
     <StudioToolbar onUndo={...} onRedo={...} canUndo={...} canRedo={...} />
   )}
   {pencilDetected && !isInPaperCanvas && (
     <GhostToolbar />
   )}
   ```
   Keep `MobileStudyToolbar` for iPhone (lines 3756-3783) untouched.

4. **Update prop pass-throughs** to `<InkOverlay>` and `<MarginAnnotationLayer>`: remove `penColor`, `penSize`, `penGlow`, `fingerDrawing` props — those components will read from the Zustand store directly.

### Integration: `InkOverlay.tsx`

1. Import `usePencilTools`, `getActiveFilterId`, `getBrushStrokeOptions` from the store.
2. Read `activeTool`, `brushStyle`, `color`, `size`, `opacity` from the store instead of props.
3. Keep `penColor`/`penSize`/`penGlow`/`fingerDrawing` in the props interface as optional fallbacks for backward compatibility, but prefer store values.
4. Replace hardcoded `STROKE_OPTIONS` with `getBrushStrokeOptions(brushStyle, size, pressure)` at stroke generation time.
5. Apply `getActiveFilterId()` as SVG `filter` attribute on finalized stroke paths (not during live RAF drawing).

### Integration: `MarginAnnotationLayer.tsx`

1. Import `usePencilTools` and read `color`, `size`, `marginRule`, `activeTool`.
2. Keep `penColor`/`penSize` props as optional fallbacks.
3. Use `marginRule` from store to drive the background grid pattern (dots/lines/none).

### What stays unchanged

- `MobileStudyToolbar` — iPhone toolbar is unaffected
- `iPadStudyToolbar.tsx` — file stays but becomes dead code (no imports reference it)
- `InkOverlay` gesture detection (underline, circle, X) — unchanged
- `MarginAnnotationLayer` gesture detection — unchanged
- Canvas/session creation flow — unchanged

### Summary

| File | Action |
|------|--------|
| `package.json` | Add `zustand` |
| 8 uploaded files | Create in `src/hooks/` and `src/components/bible/toolbar/` |
| `BibleReader.tsx` | Remove inline state, wire store + hooks, replace iPad toolbar |
| `InkOverlay.tsx` | Read from store, use brush-aware stroke options + filters |
| `MarginAnnotationLayer.tsx` | Read from store for color/size/marginRule |

