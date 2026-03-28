

## Problem

The chat input at the bottom of the PrayerAssist page (`sticky bottom-0`) is hidden behind the mobile tab bar (`fixed bottom-0 z-50`), which is approximately 60-70px tall.

## Fix

Add bottom padding to the sticky input container on mobile so it sits above the tab bar.

### File: `src/pages/PrayerAssist.tsx`

**Line 290** — Update the sticky input wrapper to include bottom padding that accounts for the mobile tab bar height:

```tsx
<div className="sticky bottom-0 border-t border-border bg-card/95 backdrop-blur pb-[70px] sm:pb-0">
```

This adds ~70px of bottom padding on mobile (matching the tab bar height) and removes it on `sm:` breakpoints and above where the tab bar is hidden.

