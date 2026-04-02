

# Dim Bottom Nav on /Bible in Dark Mode

## What
When the Bible reader's dark mode (`bible-dark`) is active, the MobileTabBar should use a dark, dimmed style instead of its hardcoded warm-cream background.

## How

**Single file change**: `src/components/MobileTabBar.tsx`

1. Detect dark mode by checking if `document.documentElement` has the `bible-dark` class, using a state variable synced via a `MutationObserver` on the `<html>` element's class list (since bible dark mode is toggled dynamically by BibleReader).

2. Swap the inline `style` values when dark mode is active:
   - **Background**: `hsl(0 0% 7% / 0.92)` → near-black glass
   - **Border top**: `hsl(0 0% 18% / 0.5)` → subtle dark border
   - **Box shadow**: `0 -2px 20px -4px hsl(0 0% 0% / 0.3)` → dark shadow
   - Keep the same blur/saturate backdrop filter

3. Also conditionally adjust icon/label colors — the existing `text-primary` and `text-muted-foreground` CSS vars already remap correctly under `.bible-dark`, so no class changes needed for those.

