

## Hide Bible Navigation in Paper Canvas Study Mode + Floating Nav Button

### What Changes

**`src/components/bible/BibleReader.tsx`** — 4 targeted edits:

1. **New state**: Add `const [studyNavOpen, setStudyNavOpen] = useState(false);`

2. **Hide the sticky toolbar** (line ~1896): Wrap the entire `<div className="sticky top-0 z-30 ...">` block (lines 1896–2114) in a condition: `{!(studyMode && studyModeVariant === "margin") && ( ... )}`. This hides the toolbar, edge tabs (suggestions/iPad banners), version/book/chapter selectors, search, text size, reading mode toggle, sleeve/pocket buttons — all of it.

3. **Hide the chapter heading** (line ~2123): Wrap the `<motion.header>` block (lines 2123–2169) in the same condition: `{!(studyMode && studyModeVariant === "margin") && ( ... )}`.

4. **Hide the bottom chapter nav** (line ~2418): Wrap the `<nav className="mt-12 ...">` block (lines 2418–2443) in the same condition.

5. **Update toggleFocusMode** (line ~904): Add `setStudyNavOpen(false)` when focus mode is toggled, so the overlay closes.

6. **Add floating nav button + slide-down overlay** — render right after the toolbar block (after line 2114), before the reading area:

   - **Floating button**: Fixed top-left (top: 12, left: 12, z: 70), 36×36 dark circle with `BookOpen` icon. Visible when `studyMode && studyModeVariant === "margin" && !studyNavOpen`.
   
   - **Slide-down overlay**: Fixed top strip (z: 80) with heavy frosted glass (`rgba(255,255,255,0.92)` / dark equivalent, `backdrop-filter: blur(24px) saturate(1.4)`). Contains:
     - Header row: "{Book} {Chapter}" label + close button (X icon)
     - Version/Book/Chapter Select dropdowns — reuse the exact same `Select` components and `onValueChange` handlers already in the toolbar (not duplicated — extracted into a shared fragment or rendered conditionally in the overlay)
   
   Visible when `studyMode && studyModeVariant === "margin" && studyNavOpen`.

   - **Backdrop**: A fixed full-screen transparent overlay behind the nav panel that closes it on tap.

### Technical Details

**Avoiding duplication of Select components**: Extract the version/book/chapter selector row (lines 1906–1969) into a local variable or inline JSX fragment assigned once, then render it in either the toolbar or the overlay depending on study mode state. This keeps a single source of truth for the selectors.

**Dark mode frosted glass**: The overlay background uses CSS custom properties:
```
background: color-mix(in srgb, var(--background) 92%, transparent)
```
This works in both light and dark mode without separate detection.

**KeepReadingNav blur in study mode**: In `Bible.tsx` (the page component), pass a prop or class to `KeepReadingNav` when study mode is active. Since `studyMode` lives in `BibleReader`, the simplest approach is to emit a CSS class on the `<article>` wrapper (e.g., `paper-canvas-active`) and use a CSS selector in `index.css`:
```css
.paper-canvas-active ~ nav,
:has(.paper-canvas-active) [data-keepreading-nav] {
  backdrop-filter: blur(24px) saturate(1.4) !important;
  background: color-mix(in srgb, var(--background) 92%, transparent) !important;
}
```
Or add a `data-paper-canvas` attribute to `<html>` via a useEffect in BibleReader when paper canvas study mode is active, and style the nav accordingly.

### Files to Edit

| File | Change |
|------|--------|
| `src/components/bible/BibleReader.tsx` | Hide toolbar/heading/bottom-nav, add studyNavOpen state, floating button, overlay with selectors |
| `src/index.css` | Add `.paper-canvas-active` parent selector for KeepReadingNav frosted glass |

### What Stays Visible in Study Mode
- PaperCanvas (desk + paper)
- iPadStudyToolbar (bottom pencil toolbar)
- Snap-to-center button
- Floating nav button (top-left)
- Nav overlay (when opened)

