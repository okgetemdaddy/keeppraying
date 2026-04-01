

# Universal Trash Bin — Full Scope

## Overview
Every delete action across the app gets intercepted: the item is snapshotted into a `trash_bin` table before removal, so users can retrace any accidental action within 30 days. This covers all user-created content AND interaction undos (unlikes, un-prayed, unsaved, deleted comments).

## Item Types Covered

| Category | Item Types | Source Tables |
|----------|-----------|---------------|
| Bible | highlights, bookmarks, notes, verse bunches | user_highlights, user_bookmarks, user_notes, verse_bunches + verse_bunch_items |
| Board | prayers (own), saved prayers (others'), testimonies | prayer_cards, user_saved_prayers, testimonies |
| Interactions | likes, prayed actions, praise actions, comments | likes, prayed_actions, testimony_praises, comments |
| Breath | breath collections | breath_collections |
| Groups | homework items | family_homework, circle_homework |

## Database Migration

New `trash_bin` table:

```sql
CREATE TABLE public.trash_bin (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_type text NOT NULL,
  item_id text NOT NULL,
  item_snapshot jsonb NOT NULL,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days')
);

ALTER TABLE public.trash_bin ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own trash"
  ON public.trash_bin FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_trash_bin_user ON public.trash_bin(user_id, deleted_at DESC);
```

Note: `item_id` is `text` not `uuid` because some deletes use compound keys (e.g. likes deleted by `prayer_id + user_id`).

## New Files

### `src/hooks/useTrashBin.ts`
- `trashItem(itemType, itemId, snapshot)` — inserts into `trash_bin`
- `useTrashItems(context: 'bible' | 'board' | 'all')` — query with 30-day filter, grouped by `item_type`
- `restoreItem(trashId)` — reads `item_snapshot`, re-inserts into original table, deletes from `trash_bin`
- `permanentDelete(trashId)` / `bulkDelete(ids)` / `emptyTrash(context)`
- `bulkRestore(ids)`
- Helper: `restoreToTable(itemType, snapshot)` — switch on item_type to insert back into the correct table

### `src/components/TrashBinSheet.tsx`
- Responsive sheet (drawer on mobile, side-sheet on desktop)
- Header: "Trash Bin" + count + "Empty Trash" button
- Items grouped by type with collapsible sections (Bible Annotations, Prayers, Interactions, etc.)
- Each row: item preview snippet, "Xd left" badge, restore icon (RotateCcw), delete icon (Trash2)
- Multi-select mode: checkboxes + bulk action bar ("Restore Selected" / "Delete Selected")
- "Delete All Now" with confirmation dialog
- Empty state message

## Modified Files

### All delete sites across the app
Every `.delete()` call for the covered item types gets wrapped with a pre-delete snapshot. Pattern:

```typescript
// Before deleting
const { data: snapshot } = await supabase.from("table").select("*").eq("id", itemId).single();
if (snapshot) await trashItem("item_type", itemId, snapshot);
// Then delete as before
await supabase.from("table").delete().eq("id", itemId);
toast("Moved to Trash"); // optional undo link
```

**Files to modify** (adding `trashItem` calls before each delete):
- `src/hooks/useBibleMutations.ts` — highlights, bookmarks, notes, verse bunches
- `src/pages/Prayer.tsx` — likes, prayed_actions, saved prayers
- `src/pages/Prayers.tsx` — likes, prayed_actions, saved prayers
- `src/components/board/BoardCard.tsx` — prayed_actions, saved prayers
- `src/components/breath/BreathPrayerCard.tsx` — likes, saved prayers
- `src/components/Comments.tsx` — comments
- `src/pages/Testify.tsx` — testimony_praises, saved testimonies
- `src/pages/FamilyRoomDetail.tsx` — family_homework
- `src/pages/CircleDetail.tsx` — circle_homework

### Access points
- `src/components/bible/BibleSleeveSheet.tsx` — Add Trash2 button that opens `TrashBinSheet` with `context="bible"`
- `src/components/board/SiteSettingsSheet.tsx` — Add "Trash Bin" section that opens `TrashBinSheet` with `context="board"`

## Restore Logic (by item_type)

Each item type maps back to its source table. The `restoreToTable` function switches on `item_type` and inserts the `item_snapshot` back. For compound-key items (likes, prayed_actions), the snapshot contains all columns needed to reconstruct the row.

For verse bunches: snapshot includes both the bunch row and its items array, so restore re-creates both.

## Auto-Purge

Items older than 30 days are filtered out client-side via the `expires_at` column. A simple scheduled edge function can periodically clean expired rows, but that's optional — the client query already filters by `expires_at > now()`.

