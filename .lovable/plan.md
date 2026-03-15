
## Root Cause

The `VerseLink` component has a strict **hover vs. tap split** that breaks click interaction:

- `handleTap` has `if (!isMobile) return` at line 78 — clicking on desktop does nothing
- `handleMouseEnter` has `if (isMobile) return` at line 63 — hovering on mobile does nothing
- In the Lovable preview iframe (and some touch-enabled laptops), `pointer: coarse` detection can be unreliable, putting the device in neither-working state

The network logs confirm the edge function is healthy — it returns correct summaries at 200 OK. The DB upsert caching in the edge function is also already in place and working correctly via the service role.

## Fix Plan

**One file change: `src/components/VerseLink.tsx`**

Replace the hard split with unified interaction logic:

1. **Desktop**: Keep hover-to-open tooltip. **Also** make a click toggle the tooltip open/closed (so clicking works in the preview and for users who prefer click).

2. **Mobile**: Keep the bottom sheet on tap (unchanged).

3. **Both**: Remove the strict `if (!isMobile) return` guard from `handleTap`. Instead, check: if mobile → show sheet; if desktop → toggle tooltip.

```text
Current flow:
  click  → handleTap → if (!isMobile) return  ← DEAD END on desktop
  hover  → handleMouseEnter → works on desktop only

New flow:
  click  → toggle open regardless of device type
  hover  → still works on desktop (show tooltip on hover too)
  mobile → sheet variant shown when isMobile is true
  desktop → tooltip variant shown when isMobile is false
```

**Specific changes:**

- `handleTap`: Remove the `if (!isMobile) return` guard. Let it always toggle open. Keep `e.stopPropagation()`. The `open && isMobile` / `open && !isMobile` conditions in the JSX already branch to the correct UI.
- `handleMouseEnter`: Keep as-is (desktop hover still works).
- `handleMouseLeave`: Keep as-is (desktop hover-out still works). But don't close on mouse-leave if it was opened by click — add a `openedByClick` ref so hover-close doesn't dismiss a click-opened tooltip.

This is a minimal, targeted fix. No edge function changes, no database changes needed — caching already works correctly.
