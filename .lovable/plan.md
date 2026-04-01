

# Fix Whitespace in Modals/Drawers + PrayerMethodChooser on Mobile

## Root Cause
On mobile (touch devices), these modals render inside a Vaul **Drawer** via `ResponsiveDialog`/`ResponsiveSheet`. The drawer is `flex flex-col h-auto` — it should size to its content. But two things create empty scrollable whitespace:

1. **AddPrayerModal** passes `max-h-[95vh] overflow-y-auto` as className to `ResponsiveDialogContent`. On mobile, that className merges into the `DrawerContent`, forcing a tall scrollable container even when content is short. The `overflow-y-auto` enables scrolling into empty space.

2. **SiteSettingsSheet** has `overflow-y-auto` on its `SheetContent`, which on mobile becomes a Drawer that may not fill its height.

3. **PrayerMethodChooser** uses raw `Dialog` instead of `ResponsiveDialog`, so it renders as a floating centered dialog on mobile rather than a compact bottom drawer.

## Changes

### 1. `src/components/AddPrayerModal.tsx`
- Remove `max-h-[95vh] overflow-y-auto` from the `DialogContent` className — the `ResponsiveDialogContent` wrapper already handles `max-h-[85vh]` on mobile drawers
- Instead, add `overflow-y-auto` to the inner scrollable content area (the `<div className="p-6 space-y-5">`) so only the form body scrolls, not the entire drawer
- Keep the header and footer pinned (no empty space below footer)

### 2. `src/components/board/SiteSettingsSheet.tsx`
- The `overflow-y-auto` on the `SheetContent` works fine on desktop (right-side sheet) but on mobile drawer it can create trailing whitespace
- Add `overflow-y-auto` to the inner `<div className="space-y-6 pb-8">` instead, so the drawer only sizes to its content

### 3. `src/components/board/PrayerMethodChooser.tsx`
- Switch from raw `Dialog`/`DialogContent` to `ResponsiveDialog`/`ResponsiveDialogContent`
- This makes it render as a compact bottom drawer on mobile — no floating whitespace

### Files Changed

| File | What |
|------|------|
| `src/components/AddPrayerModal.tsx` | Move `overflow-y-auto` from outer container to inner form body; remove `max-h-[95vh]` |
| `src/components/board/SiteSettingsSheet.tsx` | Move scroll to inner content div |
| `src/components/board/PrayerMethodChooser.tsx` | Use `ResponsiveDialog` instead of raw `Dialog` |

