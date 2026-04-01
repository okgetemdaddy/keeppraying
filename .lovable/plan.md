
# Colored Bookmarks — Implemented

Bookmarks now support multiple colors: 3 default (gold, coral, sky) + 5 expansion colors via "+" button.

## Changes Made
| File | Change |
|------|--------|
| Migration | Added `color text NOT NULL DEFAULT 'gold'` to `user_bookmarks` |
| `bookmarkColors.ts` | New palette + helpers |
| `FloatingToolbar.tsx` | Bookmark color picker with 3 swatches + "+" button |
| `useBibleChapterData.ts` | `UserBookmark.color` + updated select |
| `useBibleMutations.ts` | Color-aware toggle (add/remove/change color) |
| `BibleReader.tsx` | Colored `BookmarkRibbon`, updated handler & props |
| `BibleSleeveSheet.tsx` | Colored bookmark dots |
| `BoardBibleAnnotations.tsx` | `color` in type/query, colored dots |
| `PrayerCalendar.tsx` | `color` in bookmark select |
