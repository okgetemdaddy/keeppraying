

# Fluid Spatial Geometry — Anchored Viewport with Semantic Zoom

## Summary

Transform the Bible reader from a fixed-width reading pane into a fluid, user-controlled spatial canvas where text alignment, margin width, and background patterns are dynamically adjustable — without breaking ink gestures or reading flow.

This is **Phase 1** of the broader semantic zoom vision. It delivers the layout system and workspace controls. Word-level span wrapping and pinch-to-resize (Phases 2-3 from prior discussion) are deferred to a follow-up.

---

## What Gets Built

1. **Text alignment**: Left / Center / Right positioning of the text column
2. **Margin width slider**: 20%–70% continuous control over empty writing space
3. **Canvas background**: Blank / Dot Grid / Ruled Lines patterns in the margin
4. **Workspace Settings UI** in both iPad and Mobile toolbars

---

## Technical Details

### 1. New state in `BibleReader.tsx`

Three new `useState` hooks with localStorage persistence:

- `textAlign`: `"left" | "center" | "right"` — default `"left"`
- `marginWidth`: number `20`–`70` — default `30`
- `canvasBackground`: `"none" | "dots" | "lines"` — default `"none"`

These are passed down to `ZoomWrapper` and to both toolbars.

### 2. Refactor `ZoomWrapper.tsx`

Currently a simple `div` with `transform: scale()`. Extend it to render a **CSS Grid layout** when `marginWidth > 0`:

```text
textAlign="left":    grid-template-columns: 1fr <marginWidth>%
textAlign="right":   grid-template-columns: <marginWidth>% 1fr
textAlign="center":  grid-template-columns: <marginWidth/2>% 1fr <marginWidth/2>%
```

- The **text column** (`children`) goes in the `1fr` cell
- The **margin space** cells render an SVG `<pattern>` background (dots or lines) and have `pointer-events: none`
- The `InkOverlay` SVG remains `absolute inset-0` over the entire wrapper — ink can be drawn anywhere (text column + margins)
- The existing `transform: scale()` zoom continues to wrap the entire grid

New props: `textAlign`, `marginWidth`, `canvasBackground`.

### 3. SVG Background Patterns

Two inline SVG patterns rendered inside the margin space containers:

- **Dot grid**: 20px spacing, 1.5px radius circles, `opacity-20`
- **Ruled lines**: 32px spacing horizontal lines, `opacity-15`

Colors adapt to dark mode via `currentColor` with low opacity.

### 4. Gesture Integrity — Why It Won't Break

**InkOverlay** uses `SVG.getScreenCTM().inverse()` to map pointer coordinates to SVG space. Since the SVG is `absolute inset-0` inside ZoomWrapper, it always covers the full grid. When the grid layout changes:
- The SVG resizes with it → `getScreenCTM()` automatically reflects the new geometry
- Committed strokes render from stored point arrays in SVG space → they stay put
- `findVersesInsideStroke` queries live DOM rects of `[data-verse]` elements at gesture time → always reads current positions

**One caveat**: Strokes drawn in the margin area before a layout change may visually overlap text after the text column expands. For v1, this is acceptable — the strokes are still valid ink, just in a different spatial context.

### 5. Toolbar UI Changes

**`iPadStudyToolbar.tsx`** — Add a new expandable section (via the existing chevron pattern) containing:
- 3-button toggle row: `AlignLeft` / `AlignCenter` / `AlignRight` icons
- Slider labeled "Writing Space" (20–70%)
- 3-button toggle row: Blank / Dots / Lines (with small preview icons)

**`MobileStudyToolbar.tsx`** — Add these controls to the existing overflow `Drawer`, in a new "Workspace" section.

### 6. Files Changed

| File | Change |
|------|--------|
| `src/components/bible/ZoomWrapper.tsx` | Add grid layout, margin containers, SVG patterns |
| `src/components/bible/BibleReader.tsx` | Add 3 state hooks, pass new props to ZoomWrapper + toolbars |
| `src/components/bible/iPadStudyToolbar.tsx` | Add workspace settings section, update props interface |
| `src/components/bible/MobileStudyToolbar.tsx` | Add workspace controls to overflow drawer, update props interface |

### 7. No New Dependencies

Everything uses existing CSS Grid + inline SVG patterns. No `@use-gesture/react` needed for this phase.

