

## Plan: Reposition iPad Banner Under Bible Sleeve Button

### Current State
- Both banners are absolutely positioned inside the sticky toolbar div
- `SuggestionBanner`: `left-[5%] top-full` — hangs from toolbar bottom at 5% from left
- `iPadWaitlistBanner`: `left-[5%] top-[calc(100%+2.5rem)]` — stacked below Suggestions

### Goal
Move the iPad banner to hang from the same toolbar break line (`top-full`) but horizontally aligned under the "Your Bible Sleeve" button (which is the first button in Row 2 of the toolbar, inside the centered `max-w-3xl` content area).

### Changes

**1. `src/components/bible/BibleReader.tsx`**
- Move the `<IPadWaitlistBanner>` from its current location (lines 1947-1949, next to SuggestionBanner) into a wrapper around the Bible Sleeve button (around line 2021-2029)
- Wrap the Bible Sleeve `<Button>` in a `relative` container so the iPad banner can anchor to it
- Place `<IPadWaitlistBanner>` inside that wrapper, positioned absolutely below the Sleeve button

**2. `src/components/bible/iPadWaitlistBanner.tsx`**
- Change positioning from `left-[5%] top-[calc(100%+2.5rem)]` to `left-1/2 -translate-x-1/2 top-full` (centered under its parent)
- Keep the same `rotate(-90deg)`, animation, and focus-mode hiding behavior

This anchors the iPad pill to the Bible Sleeve button's position regardless of viewport width, while keeping both banners on the same toolbar break line.

