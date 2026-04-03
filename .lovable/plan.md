

# Swap Focus/Search Positions & Replace Search Icon with Input Field

## Overview

Swap the positions of the Search button and Focus Mode button, and replace the Search icon button with an inline search input field.

## Changes

### `src/components/bible/BibleReader.tsx` (lines 1696–1716)

Replace the current Search button + Focus Mode button block with:

1. **Focus Mode button first** (moved up) — the existing `toggleFocusMode` button with `Maximize2`/`Minimize2` icon
2. **Search input field second** (moved down, replacing the icon button) — a compact `<Input>` with placeholder `"Search…"`, that on focus or Enter opens the existing `setSearchOpen(true)` dialog. Styled to match the toolbar: small height (`h-8`), rounded, muted background, ~120px wide expanding on focus via `focus:w-48 transition-all`

```
[PanelLeft] [PenTool] [Focus] [Search Input___] ── flex-1 ── [verses selected] [TextSize] ...
```

The input acts as a trigger — typing or pressing Enter opens the full `BibleSearchDialog`. This keeps the existing search logic intact while giving a more discoverable entry point.

## Files Changed

| File | Change |
|------|--------|
| `src/components/bible/BibleReader.tsx` | Swap button order; replace Search icon button with inline Input trigger |

