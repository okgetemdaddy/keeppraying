

## Hide BibleEdgeTabs in Focus Mode

### Change
Pass `focusMode` to `BibleEdgeTabs` and animate it out gracefully when active.

### Files

**1. `src/components/bible/BibleReader.tsx`**
- Add `hidden={focusMode}` prop to the `<BibleEdgeTabs>` component (line 1944).

**2. `src/components/bible/BibleEdgeTabs.tsx`**
- Add `hidden?: boolean` to the `Props` interface.
- Wrap the outer `<motion.div>` with `AnimatePresence` and conditionally render based on `!hidden`.
- Use `exit={{ opacity: 0, y: -6 }}` for a graceful fade-up dismissal matching the existing `initial` animation.

