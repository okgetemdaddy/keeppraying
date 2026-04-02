

# Fix: Restore Light Theme When Premium Dark Is Toggled Off

## Problem

When turning off Premium Dark Mode, the code checks `prefers-color-scheme: dark` before removing the `"dark"` class from `<html>`. If the user's OS is in dark mode, the class stays — leaving the Bible reader stuck in dark theme even though the toggle is off. The cleanup function also fails to remove `"dark"`.

Additionally, the code doesn't track whether `"dark"` was already present *before* Premium Dark was enabled, so toggling off can accidentally strip dark mode that was set by another part of the app.

## Fix — `BibleReader.tsx` (lines 724–739)

Track the original dark-class state when the effect mounts, then restore it on toggle-off or unmount:

```tsx
useEffect(() => {
  const root = document.documentElement;
  const hadDarkBefore = root.classList.contains("dark");

  if (premiumDark) {
    root.classList.add("dark", "bible-dark");
    if (oledMode) root.classList.add("bible-oled");
    else root.classList.remove("bible-oled");
  } else {
    root.classList.remove("bible-dark", "bible-oled");
    if (!hadDarkBefore) {
      root.classList.remove("dark");
    }
  }

  return () => {
    root.classList.remove("bible-dark", "bible-oled");
    if (!hadDarkBefore) {
      root.classList.remove("dark");
    }
  };
}, [premiumDark, oledMode]);
```

The key change: capture `hadDarkBefore` at effect setup (before `premiumDark` adds it), then use that to decide whether to restore light mode. This ensures:
- Toggling Premium Dark off **always** returns to light theme (unless the app was already in dark mode before)
- Cleanup on unmount also restores correctly

## Files Changed

| File | Change |
|------|--------|
| `src/components/bible/BibleReader.tsx` | Fix dark class restore logic in the sync effect (lines 724–739) |

