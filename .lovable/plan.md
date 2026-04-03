

# Premium Brush Engine & Tool Palette

## Overview

Replace the simple color/size pen controls with a Procreate-inspired brush system featuring 13 brush types across 3 categories, SVG texture filters, curated color palettes, and a professional tool selection UI. Live drawing stays texture-free for 60fps; textures "develop" on stroke completion.

## Architecture

```text
brushEngine.ts ──→ BrushConfig type + 13 BRUSH_PRESETS
colorPalettes.ts ──→ 4 built-in palettes + custom palette type
BrushTextures.tsx ──→ SVG <defs> filters (grain, watercolor, crayon, graphite, chalk)
ToolPalette.tsx ──→ Full palette UI (categories, brushes, colors, sliders)
                     + compact strip for inline toolbar

InkOverlay.tsx ──→ Reads brushType from strokes, applies opacity/filter/blend
                     Live path: plain (no filter). Committed: full brush rendering.

iPadStudyToolbar ─┬→ Replaces color dots + size slider with <ToolPalette compact />
MobileStudyToolbar─┘

BibleStudyContext ──→ Adds activeBrush: BrushConfig, activeColor, activeOpacity
InkStroke type ──→ Adds brushType?: BrushType (defaults to "ballpoint")
```

## Files to Create

### 1. `src/lib/brushEngine.ts`
- `BrushType` union (13 types: fine-liner, ballpoint, fountain, gel-pen, highlighter, brush-highlighter, underline, brush-pen, watercolor, calligraphy, crayon, pencil-graphite, chalk)
- `BrushConfig` interface with perfect-freehand options + rendering properties (opacity, blendMode, textureId, feather, min/max/default size)
- `BRUSH_PRESETS` record with all 13 presets as specified in the prompt
- Helper: `getBrushStrokeOptions(config, size)` → returns perfect-freehand `StrokeOptions`

### 2. `src/lib/colorPalettes.ts`
- `ColorPalette` interface (`id`, `label`, `colors[]`)
- 4 built-in palettes: Mildliner (15 colors), Earth Tones (10), Theological (10), Dark Mode Neon (10)
- Export `BUILTIN_PALETTES` array

### 3. `src/components/bible/BrushTextures.tsx`
- SVG `<defs>` component with 5 lightweight filters (≤3 primitives each):
  - `texture-grain-light`: feTurbulence low-freq
  - `texture-watercolor`: feTurbulence + feDisplacementMap
  - `texture-crayon`: feTurbulence high-freq
  - `texture-graphite`: feTurbulence medium-freq
  - `texture-chalk`: feTurbulence dusty/broken

### 4. `src/components/bible/ToolPalette.tsx`
- **Compact mode**: horizontal strip — active brush icon + 4 recent colors + "more" button
- **Full palette**: bottom sheet overlay with:
  - 3 category tabs (Writing / Marking / Artistic)
  - Tool grid with icon + label + tiny stroke preview on hover
  - Size slider with live circle preview at thumb
  - Opacity slider (contextual, only for brushes that support variable opacity)
  - Color palette grid with palette tabs (Mildliner, Earth, Theological, Custom)
  - Hex input + recent colors
  - Gold ring on active tool, inner shadow on color swatches
  - `navigator.vibrate(5)` on tool switch
  - Spring animation via framer-motion

### 5. `src/hooks/useCustomPalette.ts`
- Up to 24 custom colors
- localStorage persistence with user-scoped key
- `addColor`, `removeColor`, `reorderColors`

## Files to Modify

### 6. `src/components/bible/InkOverlay.tsx`
- Import `BrushTextures` and render inside `<defs>`
- Import `BRUSH_PRESETS`, `getBrushStrokeOptions`
- Extend `InkStroke` interface: add optional `brushType?: BrushType`
- **Committed strokes**: read `s.brushType ?? "ballpoint"` → look up config → apply:
  - `opacity` from config
  - `filter={url(#${textureId})}` if set
  - `style.mixBlendMode` from config
  - Use `getBrushStrokeOptions(config, s.size)` instead of hardcoded `STROKE_OPTIONS`
- **Live path** (RAF loop): continue using simple rendering (no texture filter) for 60fps
- **Hover cursor**: adjust radius based on active brush config
- Accept `activeBrush: BrushConfig` prop instead of separate `penSize`/`penGlow`

### 7. `src/contexts/BibleStudyContext.tsx`
- Replace `penColor`/`penSize`/`penGlow` with:
  - `activeBrush: BrushConfig` + `setActiveBrush`
  - `activeColor: string` + `setActiveColor`
  - `activeOpacity: number` + `setActiveOpacity`
- Persist last-used brush type + recent colors (5) to localStorage
- Keep backward-compatible getters: `penColor` → `activeColor`, `penSize` → `activeBrush.size`

### 8. `src/components/bible/iPadStudyToolbar.tsx`
- Remove inline color dots + size slider
- Import and render `<ToolPalette />` in compact mode in place of the color/size section
- Keep undo/redo/clear/trash/voice controls unchanged

### 9. `src/components/bible/MobileStudyToolbar.tsx`
- Same refactor: replace color dots + size presets with `<ToolPalette compact />`
- Full palette opens via the overflow drawer or by tapping the active brush icon

### 10. `src/hooks/useInkHistory.ts`
- No structural changes needed — `InkStroke` type extension is in InkOverlay

### 11. `src/components/bible/BibleReader.tsx`
- Pass `activeBrush` and `activeColor` to InkOverlay instead of `penColor`/`penSize`/`penGlow`
- Update stroke creation to include `brushType` field

## Backward Compatibility
- Existing strokes without `brushType` default to `"ballpoint"` rendering
- No data migration needed

## Performance Strategy
- Live drawing: plain SVG path, no filters → 60fps guaranteed
- On `onStrokeComplete`: committed stroke renders with full brush config (texture, blend, opacity)
- SVG filters are static `<defs>` — referenced by ID, not re-created per stroke
- Keep filter primitives ≤ 3 per texture

## Files Changed Summary

| File | Action |
|------|--------|
| `src/lib/brushEngine.ts` | Create — brush types, configs, presets |
| `src/lib/colorPalettes.ts` | Create — curated color palettes |
| `src/components/bible/BrushTextures.tsx` | Create — SVG texture filters |
| `src/components/bible/ToolPalette.tsx` | Create — full palette UI |
| `src/hooks/useCustomPalette.ts` | Create — custom color persistence |
| `src/components/bible/InkOverlay.tsx` | Modify — brush-aware rendering |
| `src/contexts/BibleStudyContext.tsx` | Modify — unified brush state |
| `src/components/bible/iPadStudyToolbar.tsx` | Modify — integrate ToolPalette |
| `src/components/bible/MobileStudyToolbar.tsx` | Modify — integrate ToolPalette |
| `src/components/bible/BibleReader.tsx` | Modify — pass brush config to InkOverlay |

