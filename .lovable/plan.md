

# Rotate iPad App Pill & Reposition to Break Bar

## What changes
The "iPad App" pill banner gets rotated 90° counter-clockwise (so text reads left-to-right horizontally but the pill itself is oriented horizontally along the toolbar break bar) and repositioned to sit at the toolbar's bottom border, 20% from the left edge of the page.

## Technical changes

### `src/components/bible/iPadWaitlistBanner.tsx`

- Remove vertical text (`writingMode: "vertical-rl"`) — text will now read normally left-to-right
- Rotate the entire button 90° counter-clockwise via `style={{ transform: "rotate(-90deg)", transformOrigin: "center center" }}`
- Change layout from `flex-col` to `flex-row` (icon + text side by side)
- Update rounded corners to `rounded-b-xl` with `border-t-0` (hangs from the bar)

### `src/components/bible/BibleReader.tsx`

- Move `<IPadWaitlistBanner>` out of the reading area `div` and into or just below the sticky toolbar `div` (the `border-b` bar at line 1767)
- Position it with `absolute` at `left-[20%] top-full` relative to the toolbar container so it hangs from the break bar at 20% from the left page edge
- Ensure the toolbar wrapper has `relative` positioning for the absolute child

### Section order of changes
1. Restyle the pill component (horizontal layout, rotated -90°, new border radius)
2. Relocate the render position from reading area to toolbar bar
3. Adjust z-index to stay above content but below modals

| File | Change |
|------|--------|
| `src/components/bible/iPadWaitlistBanner.tsx` | Rotate -90°, horizontal layout, new border styling |
| `src/components/bible/BibleReader.tsx` | Move banner to toolbar break bar at 20% left |

