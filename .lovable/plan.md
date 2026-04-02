

# Adaptive Architecture: Hardware-Based Device Detection

## Problem

The current `useIsMobile` and `useIsTouch` hooks rely purely on CSS breakpoints (768px / 1024px). A desktop user resizing their browser to 800px triggers tablet UI. iPad Study Mode features (ink overlay, pencil toolbars, spatial canvas) can leak onto desktop or phone if the window happens to be the right width.

## What Gets Built

### 1. New hook: `useDeviceDetect` (`src/hooks/useDeviceDetect.ts`)

A hardware interrogation hook that returns:

```ts
interface DeviceInfo {
  isIPad: boolean;    // true only on actual iPads
  isIPhone: boolean;  // true only on iPhones/iPods
  isDesktop: boolean; // true on Mac/PC/Linux without touch
}
```

Detection logic handles the iPadOS 13+ quirk where iPads report as "Macintosh":

```ts
const isIPad =
  /iPad/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

const isIPhone =
  /iPhone|iPod/.test(navigator.userAgent) ||
  (/Android/.test(navigator.userAgent) && navigator.maxTouchPoints > 0);

const isDesktop = !isIPad && !isIPhone;
```

- Uses `useState` with immediate sync computation (no flash of wrong UI)
- No media queries — pure JS hardware detection
- Exported as named constants for conditional rendering

### 2. Gate iPad features in `BibleReader.tsx`

Replace `isMobile` checks with `useDeviceDetect`:

- **Study Mode toggle / auto-enable**: Only allow `studyMode` to activate when `isIPad` is true
- **Pencil auto-detect toast + auto-enable**: Already pen-gated, but wrap the `studyMode` activation in `isIPad` check
- **`IPadStudyToolbar`**: Render only when `isIPad` (currently uses `!isMobile` which matches desktop too)
- **`MobileStudyToolbar`**: Render only when `isIPhone`
- **Desktop**: Neither toolbar renders; study mode unavailable
- **InkOverlay**: Only mounts when `isIPad` (or `isIPhone` with the mobile toolbar)
- **Chapter swipe disable**: Only applies when `isIPad && studyMode`

### 3. Gate iPad section in `BibleSleeveSheet.tsx`

- The "iPad Study Mode" collapsible section: wrap in `isIPad` check so it never appears on desktop or phone
- Pass `isIPad` as a prop from BibleReader

### 4. Keep existing `useIsMobile` / `useIsTouch` for non-iPad concerns

These hooks remain for general responsive layout (bottom tab bar, drawer vs dialog, etc.). Only iPad-specific features migrate to hardware detection.

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useDeviceDetect.ts` | New hook — hardware-based iPad/iPhone/Desktop detection |
| `src/components/bible/BibleReader.tsx` | Import `useDeviceDetect`; gate study mode, ink overlay, toolbars, and pencil auto-detect behind `isIPad` |
| `src/components/bible/BibleSleeveSheet.tsx` | Accept `isIPad` prop; conditionally render "iPad Study Mode" section only on iPads |

