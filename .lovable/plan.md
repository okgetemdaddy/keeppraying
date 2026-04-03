

# Bible Sleeve: Revert to Single Column + Reorganize

## What this does
Reverts the Bible Sleeve from the 2-column grid layout back to a single scrollable column. Appearance section starts expanded, all other sections start collapsed. Immersive Mode moves inside the Appearance section (no longer its own collapsible).

## Technical changes

### `src/components/bible/BibleSleeveSheet.tsx`

1. **Revert sheet width**: Change `w-[85vw] sm:w-[480px] lg:w-[560px]` back to `w-[80vw] sm:w-[360px]`

2. **Remove 2-column grid**: Replace the `grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0` container and the two inner `<div className="space-y-5">` wrappers with a single `<div className="space-y-5 pb-8">` containing all sections in order

3. **Move Immersive Mode into Appearance section**: Remove the standalone Immersive Mode collapsible (lines 587-632) and place its content inside the Appearance `CollapsibleContent` — after the OLED toggle, with a small divider. No separate section header; just render the immersive switch/tip inline

4. **Remove `SECTION_IDS.immersive`** since it's no longer a standalone section

5. **Default collapsed state**: Update `loadCollapsed()` — on first load (no localStorage key), return a set containing ALL section IDs *except* `appearance`. This means Appearance starts expanded, everything else starts collapsed. Existing users with saved preferences keep their choices

### Section order (single column)
1. Appearance (expanded by default, now includes Immersive Mode at bottom)
2. Text Size
3. iPad Study Mode (if applicable)
4. Reading Mode
5. Display Toggles
6. Highlights
7. Bookmarks
8. Notes
9. Verse Bunches
10. My Studies
11. Trash Bin

## Files changed

| File | Change |
|------|--------|
| `src/components/bible/BibleSleeveSheet.tsx` | Revert to single column, move Immersive into Appearance, default collapsed state |

