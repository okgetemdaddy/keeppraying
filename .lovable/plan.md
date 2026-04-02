

# Fix iPad Study Mode Dark Mode Support

## Problem
The iPad study mode components have hardcoded light-theme values that don't respect dark mode:
1. **ZoomWrapper**: Has `bg-[#FDFBF7]` (parchment) but `dark:bg-transparent` loses the paper feel
2. **InkOverlay**: Default pen color `#1A1A1A` (near-black) is invisible on dark backgrounds; ink-bleed filter not tuned for dark
3. **iPadStudyToolbar**: Color swatches (Iron Gall Black `#1A1A1A`) are invisible against dark toolbar backgrounds; Sepia highlighter won't show on dark backgrounds

## Changes

### 1. `src/components/bible/ZoomWrapper.tsx`
- Change `dark:bg-transparent` → `dark:bg-[#1a1a1e]` (a warm dark tone that pairs with the parchment light theme)

### 2. `src/components/bible/InkOverlay.tsx`
- Update default `penColor` from `#1a1a1a` to use a theme-aware fallback
- Add a second SVG filter `ink-bleed-dark` with slightly boosted opacity for dark backgrounds
- For committed strokes, apply the correct filter based on a `isDark` prop
- Sepia highlighter: in dark mode use `screen` blend mode instead of `multiply` (multiply darkens — invisible on dark bg)

### 3. `src/components/bible/iPadStudyToolbar.tsx`
- Make the `PEN_COLORS` array dark-mode-aware: swap Iron Gall Black for a light ink (`#E8E4DF`) in dark mode, swap Oxblood Red for a brighter red (`#C44040`)
- Accept an `isDark` boolean prop to toggle the palette
- Add a visible border/ring on dark color swatches so they're distinguishable against the dark toolbar card

### 4. `src/components/bible/BibleReader.tsx`
- Detect dark mode (check `document.documentElement.classList.contains('dark')` or use a hook) and pass `isDark` prop down to `InkOverlay` and `iPadStudyToolbar`
- When saving strokes, store the original color — on load, the overlay renders with the theme-appropriate filter but the stored data stays theme-neutral

## Files Modified
| File | Change |
|------|--------|
| `ZoomWrapper.tsx` | Dark paper tone background |
| `InkOverlay.tsx` | Dark-aware ink filter, blend mode swap for sepia, isDark prop |
| `iPadStudyToolbar.tsx` | Dark-adapted color palette, isDark prop |
| `BibleReader.tsx` | Detect dark mode, pass isDark to children |

