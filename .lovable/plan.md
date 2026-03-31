

# Fix Horizontal Side-Scrolling on Mobile

## Root Cause

There is **no global `overflow-x: hidden`** on `html` or `body`. Multiple pages use framer-motion animations with horizontal transforms (e.g. `initial={{ x: -20 }}`) that momentarily push content beyond the viewport width, triggering horizontal scroll on mobile. The Support page's update log timeline is one clear offender (`x: -20`), but this affects 12+ files across the app.

## Fix Strategy

A single, global CSS fix plus one targeted cleanup:

### 1. Add `overflow-x: hidden` to `html` and `body` in `src/index.css`

In the `@layer base` section, add:

```css
html, body {
  overflow-x: hidden;
}
```

This is the standard mobile-first approach — it prevents any element (animations, wide cards, absolute-positioned dropdowns) from causing horizontal scroll. This single line fixes every page at once.

### 2. (Optional cleanup) Constrain the root wrapper

Add `overflow-x: hidden` to the root `#root` div as a belt-and-suspenders measure:

```css
#root {
  overflow-x: hidden;
}
```

### Why not fix each animation individually?

There are 70+ framer-motion instances with `x` translations across 12 files. Fixing them one-by-one is fragile — any new animation could re-introduce the bug. The global CSS fix is the correct architectural approach and is used by virtually every production mobile web app.

## Files Changed

| File | Change |
|------|--------|
| `src/index.css` | Add `overflow-x: hidden` to `html`, `body`, and `#root` |

One file, three lines. Fixes all pages globally.

