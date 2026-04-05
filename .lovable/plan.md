

## Pencil Tools Zustand Store, Squeeze/Double-Tap Hooks, and Modular Toolbar System

### Problem

The current `iPadStudyToolbar.tsx` manages all pen state (color, size, glow, finger drawing) as inline `useState` in `BibleReader.tsx` (~60 prop-drilling references). The uploaded zip contains 9 files that replace this with a Zustand store + modular toolbar components + Apple Pencil hardware gesture hooks. Since the zip can't be extracted in this environment, I'll rebuild all 9 files from your description.

### Prerequisites

- Install `zustand` (not currently in the project)

### File 1: `src/hooks/usePencilTools.ts` — Zustand Store

Replaces all inline tool state (`inkPenColor`, `inkPenSize`, `inkPenGlow`, `inkFingerDrawing`) from BibleReader with a single Zustand store. Exports:
- `usePencilTools()` — the store hook with color, size, glow, activeTool, brushType, fingerDrawing, etc.
- `getActiveFilterId()` — returns the SVG filter ID for the current brush type (fountain/technical/wash/marker/highlighter)
- `getBrushStrokeOptions()` — returns `perfect-freehand` options tuned per brush type

Persists color/glow/brush preferences to localStorage. Includes light and dark color palettes plus neon glow colors (migrated from `iPadStudyToolbar.tsx`).

### File 2: `src/hooks/useApplePencilSqueeze.ts` — Hardware Gesture Detection

Two hooks:
- `useApplePencilSqueeze(callback)` — detects `e.button === 5` (bitmask 32) on `pointerdown`. Fires callback with `{x, y}` position. Window-level listener.
- `useApplePencilDoubleTap(callback)` — detects rapid double-tap by tracking two `pointerdown` events from `pointerType === "pen"` within 300ms at close proximity (<20px). Fires callback.

Both respect the constraint of never filtering `e.button !== 0` in existing handlers.

### File 3: `src/components/bible/toolbar/index.ts` — Barrel Export

Re-exports all toolbar components for clean imports.

### File 4: `src/components/bible/toolbar/StudioToolbar.tsx` — Canvas Mode Palette

Draggable floating toolbar for iPad Study Mode (canvas sessions). Replaces `IPadStudyToolbar` when `studyModeVariant === "canvas"`.
- Tap the active tool to expand the `BentoExpansionPanel`
- Color swatches, size slider, undo/redo/clear, trash, voice, gesture help
- Draggable via `framer-motion` drag
- Reads/writes from `usePencilTools` store instead of props

### File 5: `src/components/bible/toolbar/GhostToolbar.tsx` — Margin Mode Pill

Auto-collapsing margin annotation toolbar. Replaces `IPadStudyToolbar` when `studyModeVariant === "margin"`.
- Minimal pill that shows current color dot + active tool icon
- Expands on tap to show color row + size slider
- Has a "rules" flyout for text align, margin width, canvas background settings
- Auto-collapses after 5s of inactivity
- Reads from `usePencilTools` store

### File 6: `src/components/bible/toolbar/SqueezeRadialMenu.tsx` — Radial Picker

Appears at squeeze position when Apple Pencil Pro squeeze is detected.
- Radial layout of tool options (pen, highlighter, eraser, etc.)
- Spring animation from center
- Dismisses on selection or outside tap
- Positioned at the squeeze `{x, y}` coordinates

### File 7: `src/components/bible/toolbar/BentoExpansionPanel.tsx` — Brush Grid + Sliders

Expanded panel shown when tapping active tool in StudioToolbar.
- Brush type grid (fountain, technical, wash, marker, highlighter) with preview strokes
- Size slider with live preview
- Opacity slider
- Color palette with neon glow options

### File 8: `src/components/bible/toolbar/InkFilterDefs.tsx` — SVG Filters

Five named SVG `<filter>` elements rendered once in the InkOverlay `<defs>`:
- `fountain` — slight feather + ink bleed
- `technical` — crisp, no blur
- `wash` — heavy gaussian blur for watercolor effect
- `marker` — multiply blend with slight spread
- `highlighter` — wide, semi-transparent band

Replaces the existing hardcoded `ink-bleed` and `neon-*` filters in InkOverlay.

### Integration Changes

**`src/components/bible/BibleReader.tsx`**:
- Remove `inkPenColor`, `inkPenSize`, `inkPenGlow`, `inkFingerDrawing` useState declarations (~lines 809-818)
- Import `usePencilTools` and destructure store values
- Replace `<IPadStudyToolbar>` with `<StudioToolbar>` (canvas) and `<GhostToolbar>` (margin) — both read from the store, dramatically reducing prop count
- Add `useApplePencilSqueeze` to show `<SqueezeRadialMenu>` at squeeze position
- Add `useApplePencilDoubleTap` to toggle between last two tools

**`src/components/bible/InkOverlay.tsx`**:
- Import `usePencilTools` to read `penColor`, `penSize`, `penGlow` directly from store instead of props
- Import `getBrushStrokeOptions()` to get per-brush `perfect-freehand` options at stroke time
- Import `getActiveFilterId()` to apply the correct SVG filter per brush
- Replace hardcoded `<defs>` with `<InkFilterDefs />`
- Remove `penColor`, `penSize`, `penGlow`, `fingerDrawing` from props interface

**`src/components/bible/MarginAnnotationLayer.tsx`**:
- Import `usePencilTools` for `penColor`, `penSize` instead of props
- Remove those props from interface

**`src/components/bible/iPadStudyToolbar.tsx`**:
- Retired — no longer imported. File can remain but is dead code.

### Summary

| File | Action |
|------|--------|
| `package.json` | Add `zustand` dependency |
| `src/hooks/usePencilTools.ts` | Create — Zustand store for all pen/brush state |
| `src/hooks/useApplePencilSqueeze.ts` | Create — squeeze + double-tap detection |
| `src/components/bible/toolbar/index.ts` | Create — barrel export |
| `src/components/bible/toolbar/StudioToolbar.tsx` | Create — draggable canvas palette |
| `src/components/bible/toolbar/GhostToolbar.tsx` | Create — auto-collapsing margin pill |
| `src/components/bible/toolbar/SqueezeRadialMenu.tsx` | Create — radial tool picker |
| `src/components/bible/toolbar/BentoExpansionPanel.tsx` | Create — brush grid + sliders |
| `src/components/bible/toolbar/InkFilterDefs.tsx` | Create — 5 SVG brush filters |
| `src/components/bible/BibleReader.tsx` | Edit — wire store, replace toolbars |
| `src/components/bible/InkOverlay.tsx` | Edit — read from store, use filter defs |
| `src/components/bible/MarginAnnotationLayer.tsx` | Edit — read from store |

