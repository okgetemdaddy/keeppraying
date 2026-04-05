

## Bible Sight Study Sessions, Searchable Content, Sharing, VerseLink Context Menu

Seven interconnected changes to complete the Bible Sight ecosystem and make all user-generated content searchable, shareable, and navigable.

---

### 1. Bible Sight Study Session Storage

**`bible_sight_entries` table** already has the right columns. When a Bible Sight study session is generated (via the chat or Deep Study), save a special entry with a new `entry_type` column to distinguish sessions from journals.

**Migration:** Add `entry_type text NOT NULL DEFAULT 'journal'` and `title text` columns to `bible_sight_entries`. Values: `'journal'`, `'study_session'`. The title is auto-generated based on the study topic (e.g., "Why Does God Allow Pain? — Romans 8").

Also add `session_data jsonb` column to store the full structured study (cards, cross-refs, verses) so the drawer can reconstruct the session.

---

### 2. Bible Sight Session Cards in Bible Sleeve

Below the existing "Deep Study" button in `BibleSleeveSheet.tsx`, add a "Bible Sight" section that:
- Shows "Current chapter" subtext
- Lists recent Bible Sight Study Session cards for the current chapter (queried from `bible_sight_entries` where `entry_type = 'study_session'`)
- Each card shows: title, date/time, 3-dot menu (delete, share)
- Clicking a card opens the `DeepStudyDrawer` (renamed internally to `BibleSightDrawer` or reused) populated with that session's `session_data`

---

### 3. Search Integration — Bible Sight Sessions in `/bible` Search

**`useBibleSearch.ts`:** Add a new `SearchResultSession` type and a new DB query in the remote search:

```typescript
// Search bible_sight_entries for study sessions
const { data } = await supabase
  .from("bible_sight_entries")
  .select("id, title, book_usfm, chapter_number, summary_line, tags, created_at, entry_type")
  .eq("user_id", user.id)
  .or(`title.ilike.%${query}%,content.ilike.%${query}%,tags.cs.{${query}}`)
  .limit(5);
```

**`BibleSearchDialog.tsx`:** Add a "Bible Sight Sessions" group with `Eye` icon, showing title, chapter reference, and date. Selecting navigates to the chapter and opens the session drawer.

Also search `bible_sight_entries` where `entry_type = 'journal'` for journal search results (currently only searched in BiblePocketSheet).

---

### 4. 3-Dot Menu on All Content Cards (Delete + Share)

Add `DropdownMenu` with `MoreVertical` trigger to:

- **Journal cards** in `BiblePocketSheet.tsx` and `DeepStudyDrawer.tsx` — Delete (with confirmation) and Share
- **Bible Sight Session cards** in `BibleSleeveSheet.tsx` — Delete and Share
- **Verse Bunches** — already have management; add Share option

**Delete:** Calls `supabase.from('bible_sight_entries').delete().eq('id', id)` and invalidates queries.

**Share:** Creates a `prayer_cards` entry with label `'bible_study'` (reusing existing share-to-circles/family-rooms pattern from `CanvasExportSheet`), or copies a shareable link. Share modal reuses `SharePrayerModal` pattern.

---

### 5. VerseLink Right-Click / Long-Press → "Go to Verse"

**`VerseLink.tsx`:** Add a context menu (right-click on desktop, long-press on mobile):

- Desktop: `onContextMenu` handler prevents default, shows a small positioned menu with "Go to {reference}" option
- Mobile: Long-press detection (500ms `setTimeout` on `touchstart`, cleared on `touchend`/`touchmove`) shows the same option as a bottom sheet
- "Go to verse" navigates using `react-router`: `/bible?book={usfm}&chapter={num}&verse={start}`
- Parse the reference string back to USFM + chapter + verse using `parseBibleReferences` from `bibleReferenceParser.ts`

The existing tap/hover behavior (summary popover) remains unchanged. This adds a secondary interaction layer.

---

### 6. Bible Sight Drawer — Premium Content Display

Refactor `DeepStudyDrawer.tsx` to serve as the unified Bible Sight session viewer:

- When opened from a session card, populate with stored `session_data` 
- Chat input field moved to bottom with safe-area padding
- Full study content displayed above in premium magazine layout:
  - Ornamental SVG dividers between sections (cross motifs, vine patterns)
  - Pull-quote blockquotes with amber left-border and serif font
  - Key verses rendered as hero cards with subtle gradient backgrounds
  - Section headers with small decorative flourishes
  - Topic-relevant imagery: use tasteful SVG ornaments (olive branches, scrolls, lamp) when web images aren't available
- Dark mode: `bg-[#1C1C1E]` with warm amber/gold accents
- Light mode: cream parchment feel

---

### 7. Sharing Infrastructure for All Bible Content

Add a `ShareContentModal` component (or extend `SharePrayerModal`) that accepts:
- `contentType: 'journal' | 'study_session' | 'note' | 'bunch'`
- `contentId: string`
- Share targets: Prayer Circles, Family Rooms, copy link

For Bible Sight Study Sessions from KeepRead.ing specifically, the share creates a `prayer_cards` record with `label: 'bible_study'` and `source: 'keepreading'` so it's branded correctly.

---

### Files Changed

| File | Change |
|------|--------|
| **Migration** | Add `entry_type`, `title`, `session_data` to `bible_sight_entries` |
| `src/hooks/useBibleSearch.ts` | Add `SearchResultSession` type, query bible_sight_entries |
| `src/components/bible/BibleSearchDialog.tsx` | Add "Bible Sight" and "Journals" result groups |
| `src/components/bible/BibleSleeveSheet.tsx` | Add Bible Sight session cards section with 3-dot menus |
| `src/components/bible/DeepStudyDrawer.tsx` | Refactor as unified session viewer with magazine layout, chat input at bottom, SVG ornaments |
| `src/components/bible/BiblePocketSheet.tsx` | Add 3-dot menu (delete/share) to journal cards |
| `src/components/VerseLink.tsx` | Add right-click/long-press context menu with "Go to verse" |
| `src/components/bible/ShareContentModal.tsx` | New: share modal for journals, sessions, bunches |
| `src/components/bible/BibleReader.tsx` | Wire session card clicks, share handlers, delete mutations |

