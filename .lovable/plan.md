

# Neon Glow Ink Brushes for Bible Reader

## Summary

Add 3 luminescent "neon glow" pen options to the iPad study toolbar that produce a true optical bloom effect — bright inner core with a soft saturated halo — using layered SVG filters. This creates the "digital illuminated manuscript" aesthetic that no competitor offers.

## The Neon Effect — How It Works

Each neon stroke renders with two visual layers via SVG filters:
- **Inner core**: Near-white, low-saturation fill for the "hot filament"
- **Outer bloom**: A `feGaussianBlur` glow halo in the saturated neon color, composited with `screen` blend mode so overlapping strokes intensify light

## Color Profiles

| Name | Core (fill) | Bloom (glow) | Dark mode icon bg |
|------|------------|--------------|-------------------|
| Electric Cyan | `#E0FFFF` | `#00FFFF` | `#0a1a1a` |
| Neon Fuchsia | `#FFD8FF` | `#FF00FF` | `#1a0a1a` |
| Radiant Lime | `#EAFFEA` | `#39FF14` | `#0a1a0a` |

## Files Changed

### 1. `src/components/bible/iPadStudyToolbar.tsx`
- Add a "Neon" section after the existing color swatches (separated by a divider)
- 3 new neon color buttons with dark circular backgrounds and a CSS `box-shadow` glow on each swatch so users see the luminescent affordance before selecting
- Neon colors stored as objects with `{ core, bloom }` — selecting one sets `penColor` to the core value and passes the bloom color via a new `penGlow` prop
- When a neon color is active, show a subtle `✦` sparkle badge on the selected swatch

### 2. `src/components/bible/InkOverlay.tsx`
- Accept new `penGlow?: string` prop (the bloom color, `undefined` for normal ink)
- Add 3 new SVG `<filter>` definitions in `<defs>` — one per neon color — each containing:
  - `feGaussianBlur stdDeviation="3"` on the stroke alpha
  - `feFlood` with the bloom color
  - `feComposite` to mask the flood to the blur shape
  - `feMerge` layering: bloom halo behind, original stroke on top
- On `InkStroke`, add optional `glow?: string` field
- When creating a new stroke in `handlePointerUp`, attach the current `penGlow` value
- In `renderedStrokes`, neon strokes get:
  - Their matching neon filter applied
  - `mixBlendMode: "screen"` so overlapping neon strokes intensify
- Live preview path: when `penGlow` is set, apply the matching filter + `screen` blend mode for instant visual feedback during drawing

### 3. `src/contexts/BibleStudyContext.tsx`
- Add `penGlow: string | null` and `setPenGlow` to the context state (persisted to localStorage)
- Expose alongside existing `penColor`/`setPenColor`

### 4. `src/components/bible/BibleReader.tsx` (wiring only)
- Pass `penGlow` from context through to `InkOverlay`

## Performance

- SVG filters are GPU-composited on modern WebKit — no JS overhead during stroke rendering
- The blur radius (`stdDeviation: 3`) is intentionally small to avoid expensive pixel fills
- Live preview uses the same RAF loop — filter is applied via CSS attribute, not recalculated per frame
- No impact on the existing `perfect-freehand` stroke computation path

## What stays the same
- All existing pen colors, ink bleed filters, circle-to-select, palm rejection, undo/redo — untouched
- Normal ink strokes continue rendering exactly as before

