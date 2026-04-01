

# Fix: Immersive Mode Not Showing on iOS Mobile

## Problem

The Immersive Mode toggle does not appear on iOS devices because `document.fullscreenEnabled` and `document.webkitFullscreenEnabled` both return `false` on iOS Safari. Apple only supports the Fullscreen API for `<video>` elements, not the document. Since `useImmersiveMode` relies on these APIs, `isSupported` evaluates to `false`, and both the Bible Sleeve and Site Settings hide the section.

## Solution

Since true fullscreen is impossible on iOS Safari, the toggle should not promise "hide browser bars" on iOS. Instead, we have two options:

1. **Show a "Add to Home Screen" tip on iOS** — replace the toggle with a helpful prompt explaining that iOS users can get an immersive experience by adding the site to their Home Screen (which launches in standalone mode with no browser UI).

2. **Use scroll-based hiding** — on iOS Safari, scrolling down naturally hides the address bar. We could add a "scroll to hide" behavior trigger, but this is browser-native and doesn't need a toggle.

## Recommended Approach — Option 1

### `src/hooks/useImmersiveMode.ts`
- Add an `isIOS` detection flag (check `navigator.userAgent` for iPhone/iPad)
- Change `isSupported` to return `true` on iOS even though fullscreen isn't available, but add a new `isIOSLimited` flag
- This allows the UI to show the section with an appropriate message

### `src/components/bible/BibleSleeveSheet.tsx`
- When `isIOSLimited` is true, show an informational block instead of the toggle:
  - "On iPhone, add KeepRead.ing to your Home Screen for a full-screen, app-like experience with no browser bars."
  - Include the existing "Add to Home Screen" tip text, styled prominently

### `src/components/board/SiteSettingsSheet.tsx`
- Same treatment — show the Home Screen tip on iOS instead of the disabled toggle

## Technical Details

- Detection: `const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream`
- No new dependencies needed
- The toggle remains functional on Android (which supports the Fullscreen API)
- Standalone mode detection stays the same — if already in standalone, show "already in app mode"

