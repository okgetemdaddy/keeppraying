

# Refine Bible Search-to-Verse Navigation & Glow Animation

## Changes

### 1. `tailwind.config.ts` — Replace keyframe with compositor-safe properties only

Current keyframe animates `background` (layout property). Replace with `transform` + `box-shadow` only:

```
verse-glow: {
  "0%":   { transform: "scale(1)", boxShadow: "0 0 0 0 rgba(59, 130, 246, 0)" },
  "40%":  { transform: "scale(1.02)", boxShadow: "0 0 0 5px rgba(59, 130, 246, 0.12)" },
  "100%": { transform: "scale(1)", boxShadow: "0 0 0 0 rgba(59, 130, 246, 0)" },
}
```
Change animation duration from `2s ease-out` to `0.8s cubic-bezier(0.22, 1, 0.36, 1)`.

### 2. `src/index.css` — Update `.animate-verse-glow` + add dark mode variant + fix reduced-motion

Replace existing `.animate-verse-glow` block (lines 363-369) and the reduced-motion block (lines 371-377):

- Remove `position: relative; z-index: 1;` (unnecessary, can interfere with ink overlay stacking)
- Add `will-change: transform` to the class
- Add `.bible-dark .animate-verse-glow` with a gold-tinted `verse-glow-dark` keyframe (dark amber `rgba(184, 134, 11, ...)` instead of blue)
- Define `@keyframes verse-glow-dark` inline in CSS
- Update `prefers-reduced-motion` to cover both light and dark variants with background-color fade

### 3. `src/components/bible/BibleReader.tsx` — Scroll-end detection + same-chapter fix

**a) Add `searchNavCounter` ref** (near line 972) and increment it in `handleSearchNavigate` (line 1540). Add it to the `useEffect` dependency array (line 1046: `[verses]` → `[verses, searchNavCounter.current]`).

**b) Replace the `setTimeout(..., 400)` glow trigger** (lines 998-1018) with scroll-end detection:
- Listen for `scroll` events on `readingAreaRef.current ?? window` with a 120ms debounce
- When scroll settles, apply glow (clearPreviousGlow → willChange → reflow → add class → animationend cleanup)
- Add a 500ms fallback timeout in case no scroll event fires (element already in view)

### 4. `src/components/bible/BibleSearchDialog.tsx` — 50ms navigation delay

In `handleSelect` (line 63-86), wrap the `switch` block in a `setTimeout(..., 50)` so the dialog exit animation clears before navigation begins.

## Files Changed

| File | Change |
|------|--------|
| `tailwind.config.ts` | Compositor-safe keyframe (transform + box-shadow only), 0.8s duration |
| `src/index.css` | Dark mode gold variant, will-change, improved reduced-motion |
| `src/components/bible/BibleReader.tsx` | Scroll-end detection, searchNavCounter for same-chapter fix |
| `src/components/bible/BibleSearchDialog.tsx` | 50ms delay before navigation |

