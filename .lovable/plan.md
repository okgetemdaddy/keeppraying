

# Fix Dark Mode on Bible Reading Canvas

## Root Cause

Tailwind's `dark:` variant only activates when the `dark` class is on `<html>`. The Bible reader uses a custom `bible-dark` class instead — so `dark:bg-[#1a1a1e]` on `ZoomWrapper` (and any other `dark:` classes in Bible components) never triggers. The text turns white via CSS custom properties (`--foreground`), but the background stays cream (`#FDFBF7`), creating the "flashbang" white-on-white effect.

## Fix Strategy

Two-pronged approach — ensure the standard `dark` class is added alongside `bible-dark`, AND replace hardcoded colors with theme-aware CSS variables.

### 1. Add `dark` class to `<html>` when Premium Dark is active (`BibleReader.tsx`)

In the existing `useEffect` that manages `bible-dark` / `bible-oled` classes (around line 591-601), also toggle the standard `dark` class:

```ts
if (premiumDark) {
  root.classList.add("dark", "bible-dark");
  // ...
} else {
  root.classList.remove("dark", "bible-dark", "bible-oled");
}
```

This makes all `dark:` Tailwind variants work throughout Bible components.

**Guard**: Check if the app already has a separate dark mode system that adds/removes `dark` — if so, only add it, never remove it when `premiumDark` is false (to avoid clobbering a global dark preference). We'll check the cleanup return to only remove `bible-dark` and `bible-oled`, leaving `dark` management to whoever owns it globally.

### 2. Fix `ZoomWrapper.tsx` background

Replace the hardcoded cream with theme-aware classes:

```
bg-[#FDFBF7] dark:bg-[#1a1a1e]
```
becomes:
```
bg-background
```

Since `.bible-dark` already sets `--background: 0 0% 7%` and the default light theme has a white/cream background via the CSS variable, `bg-background` handles both states automatically through the custom property system that's already in place.

### 3. Audit other Bible components for orphaned `dark:` classes

Scan `HandwritingEngine.tsx` and `InkOverlay.tsx` for any `bg-white` without `dark:` pairs — fix with `bg-background` or explicit `dark:bg-zinc-900` pairings.

## Files

| File | Change |
|------|--------|
| `BibleReader.tsx` | Add `dark` class to `<html>` when `premiumDark` is true |
| `ZoomWrapper.tsx` | Replace `bg-[#FDFBF7] dark:bg-[#1a1a1e]` with `bg-background` |
| `HandwritingEngine.tsx` | Fix toolbar `bg-white/90` → `bg-background/90` |

