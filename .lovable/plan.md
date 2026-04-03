

# Ease the Eyes: CSS Variable Architecture (Updated)

## Problem

Current inline `filter: brightness()` causes React re-renders of the entire chapter. Using `opacity` (as previously proposed) would cause SVG highlighters and selections to bleed through the text.

## Solution

Use `color-mix(in srgb, ...)` to produce a **solid, fully opaque** dimmed color that smoothly reduces contrast without any ghosting over ink/highlight layers. The slider sets a CSS variable on `document.documentElement` — zero React re-renders.

## Changes

### 1. `src/index.css` — Add at bottom

```css
:root {
  --ease-eyes-dim: 1;
}

.bible-dark .bible-reading-canvas p,
.bible-dark .bible-reading-canvas span,
.bible-dark .bible-reading-canvas sup {
  color: color-mix(in srgb, #f4f4f5 calc(var(--ease-eyes-dim) * 100%), #09090b);
  transition: color 0.1s linear;
}
```

### 2. `src/components/bible/BibleReader.tsx`

- **Remove** the inline `filter: brightness(${easeEyesDim})` style from the reading container.
- **Add `useEffect`** to sync `easeEyesDim` state to `--ease-eyes-dim` CSS variable:
  ```tsx
  useEffect(() => {
    document.documentElement.style.setProperty('--ease-eyes-dim', String(easeEyesDim));
    return () => document.documentElement.style.setProperty('--ease-eyes-dim', '1');
  }, [easeEyesDim]);
  ```
- **Add `bible-reading-canvas`** class to the scripture content container div.

### 3. No changes to `BibleSleeveSheet.tsx`

The slider already drives `easeEyesDim` state — it will work as-is.

## Files Changed

| File | Change |
|------|--------|
| `src/index.css` | Add `--ease-eyes-dim` variable and `color-mix()` rules |
| `src/components/bible/BibleReader.tsx` | Replace inline brightness filter with CSS variable side-effect; add `bible-reading-canvas` class to reading container |

