

# Colored Bookmarks with Expandable Palette

## Overview
Currently bookmarks are colorless — just a toggle on/off. This plan adds **3 default bookmark colors** (like the highlight swatches) plus a **"+" button** to auto-assign a 4th, 5th, etc. color from a rotating palette. Users pick a color when bookmarking; the color is stored in the database and shown in the ribbon icon and Bible Sleeve.

## Database Change

**Migration:** Add a `color` column to `user_bookmarks`

```sql
ALTER TABLE public.user_bookmarks 
ADD COLUMN color text NOT NULL DEFAULT 'gold';
```

Default `'gold'` so existing bookmarks get a color automatically.

## Bookmark Color Palette

**File:** `src/components/bible/bookmarkColors.ts` (new)

Define 3 default colors + 5 expansion colors (8 total, like bunch colors):

| Slot | Key | Visual |
|------|-----|--------|
| Default 1 | `gold` | Gold/amber ribbon |
| Default 2 | `coral` | Coral/red ribbon |
| Default 3 | `sky` | Sky blue ribbon |
| +1 | `emerald` | Green |
| +2 | `violet` | Purple |
| +3 | `rose` | Pink |
| +4 | `teal` | Teal |
| +5 | `orange` | Orange |

Exports: `DEFAULT_BOOKMARK_COLORS`, `EXPANSION_BOOKMARK_COLORS`, `ALL_BOOKMARK_COLORS`, Tailwind class map, and a helper to get the next auto-assigned color based on how many the user has used.

## FloatingToolbar Changes

**File:** `src/components/bible/FloatingToolbar.tsx`

Replace the single bookmark toggle button with a bookmark color picker:
- Show 3 default color swatches (gold, coral, sky) as small bookmark-shaped dots
- If the verse is already bookmarked in a color, that swatch shows an X (tap to remove)
- A small **"+"** button appears after the 3 defaults — clicking it auto-assigns the next expansion color and bookmarks the verse
- The `onToggleBookmark` signature changes to include `color`:
  ```ts
  onToggleBookmark: (verseNumber: number, color: string, existingId?: string) => void;
  ```

## Data Flow Updates

### `useBibleChapterData.ts`
- Update `UserBookmark` type to include `color: string`
- Update the select query to include `color`

### `useBibleMutations.ts`
- Update `toggleBookmark` to accept and insert `color`
- Optimistic update includes the color

### `BibleReader.tsx`
- Update `BookmarkRibbon` to receive and render the bookmark's color (tint the icon)
- Pass color through `handleToggleBookmark`
- Update `bookmarkMap` usage to carry color info to the toolbar

### `BibleSleeveSheet.tsx`
- Group bookmarks by color (like highlights are grouped)
- Show colored bookmark dots next to each entry

### `BoardBibleAnnotations.tsx` and `PrayerCalendar.tsx`
- Minor: include `color` in select queries (backward compatible since it has a default)

## Files Summary

| File | Action |
|------|--------|
| Migration SQL | Add `color` column to `user_bookmarks` |
| `src/components/bible/bookmarkColors.ts` | **New** — color palette + helpers |
| `src/components/bible/FloatingToolbar.tsx` | Replace bookmark button with color picker + "+" |
| `src/hooks/useBibleChapterData.ts` | Add `color` to `UserBookmark` type + query |
| `src/hooks/useBibleMutations.ts` | Accept `color` in toggle mutation |
| `src/components/bible/BibleReader.tsx` | Colored `BookmarkRibbon`, updated handler |
| `src/components/bible/BibleSleeveSheet.tsx` | Group bookmarks by color |
| `src/components/board/BoardBibleAnnotations.tsx` | Add `color` to select |
| `src/components/board/PrayerCalendar.tsx` | Add `color` to select |

