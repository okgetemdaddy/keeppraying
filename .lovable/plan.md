

# Add Color Tint to "Ease the Eyes"

## Overview

Add a **Page Tint** color picker (preset swatches + custom picker) below the existing dim slider. The tint color replaces the hardcoded `#f4f4f5` in the `color-mix()` formula via a new `--ease-eyes-tint` CSS variable.

## Changes

### 1. `src/index.css`

- Add `--ease-eyes-tint: #f4f4f5` to the `:root` block (line 334)
- Replace the hardcoded `#f4f4f5` in the `color-mix()` rule (line 353) with `var(--ease-eyes-tint)`
- Use `!important` and a smoother easing: `transition: color 0.15s cubic-bezier(0.4, 0, 0.2, 1)`

### 2. `src/components/bible/BibleReader.tsx`

- Add `easeEyesTint` state with localStorage persistence (key: `bible_ease_tint`, default: `#f4f4f5`)
- Add `handleEaseEyesTintChange` callback to update state + localStorage
- Add `useEffect` to sync `--ease-eyes-tint` to `document.documentElement`, resetting on unmount
- Pass `easeEyesTint` and `onEaseEyesTintChange` props to `BibleSleeveSheet`

### 3. `src/components/bible/BibleSleeveSheet.tsx`

- Add `easeEyesTint` and `onEaseEyesTintChange` to the props interface
- Add the **TINT_PRESETS** array: Neutral (`#f4f4f5`), Amber (`#fbbf24`), Sepia (`#d4a574`), Sage (`#86efac`), Sky (`#93c5fd`)
- Below the dim slider (after line 331), insert a "Page Tint" section with:
  - Label: `"Page Tint"` in uppercase tracking-wider style
  - Horizontal row of circular swatches — active swatch gets emerald border, scale-110, and a subtle glow shadow
  - A `+` button at the end wrapping a hidden `<input type="color">` for custom tint selection
- Entire section gated by `premiumDark` (same opacity/pointer-events pattern as dim slider)

## Files Changed

| File | Change |
|------|--------|
| `src/index.css` | Add `--ease-eyes-tint` variable; use it in `color-mix()` rule |
| `src/components/bible/BibleReader.tsx` | Add tint state, localStorage persistence, CSS variable sync, pass to sleeve |
| `src/components/bible/BibleSleeveSheet.tsx` | Add tint preset swatches + custom color picker UI below dim slider |

