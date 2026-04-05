

## Fix: Bible Sight Drawer Not Opening

### Root Cause

The URL-based drawer state persistence introduced a **race condition**. When you click "Bible Sight" in the Sleeve, two `setSearchParams` calls fire back-to-back:

1. `onOpenBibleSight()` → sets `?sight=1`
2. `onOpenChange(false)` → removes `?sleeve`

React Router's `setSearchParams` does not reliably queue functional updates like React's `setState`. The second call reads stale `searchParams` (the current URL, without `sight=1`), so it **overwrites** the first call. Result: `sleeve` gets removed, but `sight=1` is never actually applied — the drawer never opens.

The same bug affects the "Commentary" and "Deep Study" buttons in the Sleeve.

### Fix

**File: `src/components/bible/BibleReader.tsx`**

Replace the individual `onOpenBibleSight` and `onOpenCommentary` callbacks with versions that set **both** params in a single `setSearchParams` call (open the target drawer AND close the sleeve atomically):

```typescript
onOpenBibleSight={() => {
  setSearchParams(prev => {
    const next = new URLSearchParams(prev);
    next.set("sight", "1");
    next.delete("sleeve");
    return next;
  }, { replace: true });
}}

onOpenCommentary={() => {
  setSearchParams(prev => {
    const next = new URLSearchParams(prev);
    next.set("commentary", "1");
    next.delete("sleeve");
    return next;
  }, { replace: true });
}}
```

Then update the `BibleSleeveSheet` click handlers for Bible Sight and Commentary to call **only** `onOpenBibleSight()` / `onOpenCommentary()` without the separate `onOpenChange(false)` — since the sleeve closure is now bundled into the callback.

**File: `src/components/bible/BibleSleeveSheet.tsx`**

Change the Bible Sight button handler (line ~975-978):
```typescript
onClick={() => {
  onOpenBibleSight();
  // No separate onOpenChange(false) — sleeve close is handled atomically
}}
```

Same pattern for the Commentary button (line ~992-994).

### Files Changed

| File | Change |
|------|--------|
| `src/components/bible/BibleReader.tsx` | Combine drawer-open + sleeve-close into single `setSearchParams` calls |
| `src/components/bible/BibleSleeveSheet.tsx` | Remove redundant `onOpenChange(false)` after Bible Sight / Commentary clicks |

