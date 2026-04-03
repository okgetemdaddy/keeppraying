

## Fix: Overlapping Suggestion & iPad Waitlist Banners

**Problem**: Both banners use `absolute left-0 top-full` positioning. The `marginLeft: 90px` on the iPad banner doesn't properly separate them after the -90deg rotation — they visually overlap as seen in the screenshot.

**Root cause**: With `-90deg` rotation and `transformOrigin: center center`, both banners occupy the same visual space along the left edge. Margin-left shifts horizontally in layout space but doesn't reliably separate rotated elements.

**Fix approach**: Remove the `marginLeft` hack from the iPad banner and instead use distinct `top` offsets to stack them vertically along the left edge. After rotation, different `top` values will separate them along the left border without overlap.

### Changes

1. **`src/components/bible/SuggestionBanner.tsx`**
   - Keep `left-0 top-full` — this banner stays closest to the toolbar.

2. **`src/components/bible/iPadWaitlistBanner.tsx`**
   - Remove `marginLeft: "90px"` from inline styles.
   - Change `top-full` to a calculated top offset (e.g., `style={{ top: "calc(100% + 80px)" }}`) to push it further down the left edge, below the Suggestions banner. The exact pixel offset (~80px) accounts for the rendered width of the Suggestions button after rotation.

This ensures both banners sit along the left page border, stacked vertically with clear separation.

