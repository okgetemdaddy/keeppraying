

## Add "Clear All Edits" to Bible Sleeve

### What It Does
Adds a new collapsible section in the Bible Sleeve (above Trash Bin) with three destructive actions that let users bulk-remove their highlights, bookmarks, notes, and annotations — scoped to **this chapter**, **today**, or **entire Bible**.

Each option shows a confirmation dialog with the count of items that will be removed. Deleted items go to the Trash Bin (30-day recovery) via the existing `trashItem` utility.

### Changes

**1. `src/hooks/useBibleMutations.ts`** — Add three bulk-clear mutations

- `clearChapterEdits`: deletes all highlights, bookmarks, and notes for a specific book+chapter, trashing each first
- `clearTodayEdits`: deletes all highlights/bookmarks/notes created today (UTC), across all books
- `clearAllEdits`: deletes every highlight, bookmark, and note for the user, trashing each first

Each mutation queries the relevant tables, loops through results calling `trashItem`, then bulk-deletes by IDs, and invalidates all `bible` query keys.

**2. `src/components/bible/BibleSleeveSheet.tsx`** — Add UI section

- Add a new collapsible section "Clear Edits" with `Eraser` icon between Trash Bin and iPad Waitlist
- Three buttons inside, each with a confirmation `window.confirm()` showing item counts:
  - **This Chapter** — clears highlights/bookmarks/notes for `currentBook`+`currentChapter`
  - **Today's Edits** — clears everything created today
  - **Whole Bible** — clears everything (strongest warning)
- Add callback props: `onClearChapter`, `onClearToday`, `onClearAll`
- Add count props: `chapterEditCount`, `todayEditCount`, `totalEditCount` (pre-computed in BibleReader)

**3. `src/components/bible/BibleReader.tsx`** — Wire it up

- Import and call the new bulk-clear mutations from `useBibleMutations`
- Compute edit counts from existing `chapterData` (highlights + bookmarks + notes lengths) and pass to BibleSleeveSheet
- For today/all counts, run lightweight count queries or derive from cached data
- Pass `onClearChapter`, `onClearToday`, `onClearAll` callbacks that invoke the mutations

### Files
| File | Change |
|------|--------|
| `src/hooks/useBibleMutations.ts` | Add `clearChapterEdits`, `clearTodayEdits`, `clearAllEdits` mutations |
| `src/components/bible/BibleSleeveSheet.tsx` | Add "Clear Edits" collapsible section with three scoped buttons |
| `src/components/bible/BibleReader.tsx` | Wire mutations and counts to the Sleeve props |

