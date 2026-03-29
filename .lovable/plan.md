

## Plan: Upload Image in Card Menu + Remove Old Board Background

### Task 1: Add "Upload Image" to Prayer Card `...` Menu

**File: `src/components/board/BoardCard.tsx`**

Add an "Upload Image" menu item in the `ActionButtons` `...` dropdown (after the card color presets section, before Remove). This lets any card owner upload or replace a background image at any time.

- Add a hidden `<input type="file" accept="image/*">` ref inside `ActionButtons`
- Add a new `DropdownMenuItem` with an `ImagePlus` icon labeled "Upload Image"
- On click, trigger the file input
- On file select:
  - Upload to `prayer-backgrounds` bucket (path: `userId/timestamp.ext`)
  - Get the public URL
  - Update `prayer_cards.background_url` for that card
  - Call `onRefresh()` to reload
  - Show success toast
- Also add a "Remove Image" item when the card already has a background image

**Props change**: Add `onUploadImage` callback to `ActionButtonsProps` (or handle inline with a ref). Also need `userId` passed down.

### Task 2: Remove Old ThemeCanvas Board Background

The old `ThemeCanvas` (particles, stars, leaves, rain, ripples, candle animations) is now superseded by the new `AtmosphereCanvas`. They currently render on top of each other, which clutters the background.

**File: `src/pages/Board.tsx`**
- Remove the `ThemeCanvas` import and its `<ThemeCanvas>` render call (line 382)
- Remove the old `theme.overlay` div (line 383) — the AtmosphereCanvas handles its own visual treatment
- Keep the `<div className={theme.bgClass}>` for the static gradient base color (this provides the CSS variables and base gradient that cards still use)
- Remove the `ThemeCanvas` import from line 16

**File: `src/components/board/ThemeCanvas.tsx`**
- Leave the file in place (not deleting) but it will no longer be imported. Can be cleaned up later.

### Summary of Changes

| File | Change |
|------|--------|
| `src/components/board/BoardCard.tsx` | Add "Upload Image" and "Remove Image" items to `...` dropdown menu |
| `src/pages/Board.tsx` | Remove `ThemeCanvas` import + render, remove overlay div |

No database changes needed — `prayer-backgrounds` bucket and `background_url` column already exist.

