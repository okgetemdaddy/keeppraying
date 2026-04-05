

## Deep Study Layout Adjustments

Three changes to how the study rail renders:

### 1. Move "Keep All" to bottom of content

In `AutoEnrichLayer.tsx`, remove the "Keep All" button from the top HUD bar (lines 389-399) and add it as a bottom bar after the cards list (after line 452, before the empty state). Same styling but positioned at the end of the scrollable content.

### 2. Two-column card grid when space allows

In `AutoEnrichLayer.tsx`, change the cards container (line 414, currently `space-y-4`) to use a responsive grid: `grid grid-cols-1 xl:grid-cols-2 gap-4`. This gives two columns on wide viewports (the 320px rail won't hit `xl`, but when the rail is wider or text is smaller, it will). We'll use a container-query approach or a simpler media query: since the study rail lives inside a grid column, we use CSS `@container` or just check `min-width` via a wrapper. Simplest: make the cards wrapper use `columns-1 xl:columns-2` or use `grid grid-cols-1 @[480px]:grid-cols-2 gap-4` with Tailwind container queries on the parent.

### 3. Shift Bible text to 30% from left

In `BibleReader.tsx` line 3463, change the grid template from `grid-cols-[1fr_320px]` to `grid-cols-[30%_1fr]` so the text column starts at 30% from the left edge and the study rail gets the remaining ~70%. The text column class (line 3475 `max-w-none`) stays as-is.

### Files

| File | Change |
|------|--------|
| `src/components/bible/AutoEnrichLayer.tsx` | Move "Keep All" below cards; add two-column grid with container query |
| `src/components/bible/BibleReader.tsx` | Change grid template to `grid-cols-[30%_1fr]` |

