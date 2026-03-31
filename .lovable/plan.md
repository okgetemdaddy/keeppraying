

# Fix: Floating Toolbar Layout on Desktop

## Problem
In `ToolbarActions`, the root `<div>` has no flex class when `layout="horizontal"` — it defaults to block stacking. The swatches, separator, and action buttons render on separate rows instead of one compact horizontal strip.

## Fix
**File:** `src/components/bible/FloatingToolbar.tsx`

**Line 81** — Change the root div class from empty string to `flex items-center`:
```tsx
// Before
<div className={isVertical ? "space-y-4" : ""}>

// After
<div className={isVertical ? "space-y-4" : "flex items-center"}>
```

That single class addition puts swatches, separator, and action buttons all in one horizontal row — matching the intended compact floating toolbar appearance.

### Files Modified
| File | Change |
|------|--------|
| `src/components/bible/FloatingToolbar.tsx` | Add `flex items-center` to horizontal layout root div |

