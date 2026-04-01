

# Hide All Scrollbars App-Wide

## Summary
Apply the `scrollbar-hide` utility globally so no scrollbar is ever visible — users can still scroll freely, but no bar renders. This is a two-part approach: a global CSS rule plus targeted cleanup of `ScrollArea` components that render their own styled scrollbar thumbs.

## Changes

### 1. `src/index.css` — Global scrollbar suppression
Replace the existing custom scrollbar styles (lines 274–281) with the `scrollbar-hide` approach applied to everything:

```css
/* Hide all scrollbars globally */
* { -ms-overflow-style: none; scrollbar-width: none; }
*::-webkit-scrollbar { display: none; }
```

Remove the existing `::-webkit-scrollbar`, `::-webkit-scrollbar-track`, `::-webkit-scrollbar-thumb` rules. Keep the `.scrollbar-hide` utility class for explicit use.

### 2. `src/components/ui/scroll-area.tsx` — Hide the Radix scrollbar thumb
The `ScrollArea` component renders a visible `ScrollBar` thumb by default. Update `ScrollArea` to **not render `<ScrollBar />`** inside, so no thumb appears. The component still provides smooth overflow behavior via the Radix viewport.

### 3. Individual files — No code changes needed
Once the global CSS hides all scrollbars and `ScrollArea` stops rendering its thumb, all 33+ files using `overflow-y-auto` / `overflow-x-auto` and all 6 files using `ScrollArea` / `ScrollBar` will automatically have hidden scrollbars with no per-file edits required.

## Result
- Zero visible scrollbars anywhere in the app (popups, drawers, sheets, pages, dialogs)
- All scrollable areas remain fully scrollable via touch/trackpad/mouse wheel
- Clean, minimal aesthetic throughout

