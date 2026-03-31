

## Make Support Price Cards Compact — 4 Per Row

### Changes in `src/pages/Support.tsx`

**1. Remove descriptions from tier data (lines 21-31)**
- Delete the `description` property from all items in `ONE_TIME_TIERS` and `RECURRING_TIERS`

**2. Update grid to 4 columns (line 269)**
- Change `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4` → `grid-cols-2 sm:grid-cols-4 gap-3`

**3. Shrink card content (lines 280-303)**
- Remove the description `<p>` element (line 287)
- Reduce icon container: `w-12 h-12` → `w-9 h-9`, icon: `w-6 h-6` → `w-4 h-4`
- Reduce padding: `p-6` → `p-3`
- Reduce gap: `gap-4` → `gap-2`
- Make button smaller: add `size="sm"`
- Keep label text and price text sizes as-is

### Files changed
1. `src/pages/Support.tsx`

