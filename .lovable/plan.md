

# Mobile Pen Bar for Bible Study Mode

## Problem
The `IPadStudyToolbar` was designed for iPad-width screens (10+ color swatches, neon inks, size slider, zoom/spacing row). On a phone (430px wide), everything crams together and overflows, as shown in the screenshot.

## Solution
Create a new `MobileStudyToolbar` component optimized for phone screens, and conditionally render it instead of `IPadStudyToolbar` when `useIsMobile()` is true.

## Changes

### 1. New file: `src/components/bible/MobileStudyToolbar.tsx`

A compact, phone-optimized ink toolbar with the same props interface as `IPadStudyToolbar`. Design:

- **Single fixed row** at the bottom (above the tab bar, ~bottom-28), full-width pill
- **5 color dots** (standard palette only, no neon row — keep it simple for phone)
- **Pen size**: small/medium/large toggle (3 preset sizes) instead of a slider
- **Undo/Redo**: two icon buttons
- **Eraser (clear)**: one icon button
- **Overflow menu** (three-dot or chevron): opens a bottom sheet with:
  - Neon glow ink selection
  - Finger drawing toggle
  - Zoom slider
  - Spacing slider
  - Trash bin & voice note buttons
- **Collapse/expand** via a minimal "✏️" pill (same pattern as iPad version)
- No secondary row — everything fits in one compact strip + overflow sheet

Layout sketch:
```text
┌─────────────────────────────────────────┐
│ ● ● ● ● ●  │ S M L │ ↩ ↪ ◌ │ ⋯ │ ▾ │
└─────────────────────────────────────────┘
         ~44px tall, full-width pill
```

### 2. Edit: `src/components/bible/BibleReader.tsx`

At the existing `IPadStudyToolbar` render site (~line 2009-2034):
- Import `MobileStudyToolbar`
- Use `useIsMobile()` (already imported) to conditionally render:
  - Phone: `<MobileStudyToolbar ...props />`
  - Tablet/Desktop: `<IPadStudyToolbar ...props />` (unchanged)

### 3. No other files changed

Same props, same state, same callbacks — just a different visual shell for phones.

