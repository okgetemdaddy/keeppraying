

# Unhighlight, Board Editing, and Add-to-Existing-Bunch

## Overview
Three features: (1) show an X on the active highlight color swatch in the floating toolbar so users can remove highlights, (2) allow deleting highlights and editing notes from /board, and (3) let users add verses to an existing Verse Bunch.

---

## 1. Remove highlight via floating toolbar

**File: `src/components/bible/FloatingToolbar.tsx`**

- Add new props: `existingHighlightColor?: string`, `existingHighlightId?: string`, `onRemoveHighlight?: (highlightId: string) => void`
- In the swatch rendering loop, if `swatch.key === existingHighlightColor`, overlay a small X icon on that swatch. Clicking it calls `onRemoveHighlight(existingHighlightId)` + `onDismiss()` instead of adding a highlight.
- Other swatches still apply a new highlight color as before.

**File: `src/components/bible/BibleReader.tsx`**

- When rendering `<FloatingToolbar>`, derive the existing highlight color/ID from `highlightMap` for the primary selected verse.
- Pass `existingHighlightColor`, `existingHighlightId`, and wire `onRemoveHighlight` to `mutations.removeHighlight.mutate`.

---

## 2. Delete highlights and edit notes from /board

**File: `src/components/board/BoardBibleAnnotations.tsx`**

- **Highlights**: Add an X button on each highlight pill. Clicking it calls `supabase.from("user_highlights").delete().eq("id", h.id)` and invalidates the query. Use `useMutation` + `useQueryClient` for optimistic removal.
- **Notes**: Add a pencil/edit icon on each note card. Clicking opens an inline `Textarea` (similar to `NoteInputPanel`) pre-filled with `note_content`. Save calls `supabase.from("user_notes").update({ note_content }).eq("id", n.id)` and invalidates. Add a trash icon to delete notes as well.
- Wrap delete actions with a confirm (e.g. a simple `window.confirm` or a small inline "Are you sure?" toggle).

---

## 3. Add verses to an existing Verse Bunch

**Best approach**: When the user has 1+ verses selected and clicks "Bunch" in the floating toolbar (or the "Create Bunch" button in the `SelectedVersesStrip`), show a choice: "Create New Bunch" or "Add to Existing Bunch" (listing their bunches).

**File: `src/components/bible/VerseBunchDialog.tsx`**

- Add a new step/variant: when the user already has bunches, show a "Add to Existing" option alongside the current "Create New" form.
- Display a scrollable list of existing bunches (from `useUserVerseBunches`) with name + verse count. Clicking one adds the selected verses to that bunch.

**File: `src/hooks/useBibleMutations.ts`**

- Add a new mutation `addToBunch`:
  ```ts
  addToBunch.mutate({ bunchId: string, items: CrossBunchItem[] })
  ```
  Inserts new `verse_bunch_items` rows for the given bunch. On success, invalidates `["verse_bunches"]` and the chapter data query. Shows toast "Added to [bunch name]".

**File: `src/components/bible/BibleReader.tsx`**

- Wire `handleBunchConfirm` to also handle the "add to existing" case by calling `mutations.addToBunch.mutate` when a `bunchId` is provided.
- Pass `bunches` list to `VerseBunchTooltip` so it can render the existing bunches.

---

## Technical Details

- `FloatingToolbar` receives highlight info for the primary verse only (single-verse context). For multi-verse selection, the X-to-remove only applies if all selected verses share the same highlight.
- Board annotation mutations use standalone `useMutation` calls within `BoardBibleAnnotations` (no shared hook needed since the board doesn't share the chapter cache key).
- `addToBunch` mutation deduplicates: uses `ON CONFLICT DO NOTHING` or filters client-side to avoid inserting duplicate verse items.
- Query invalidation keys: `["board", "highlights"]`, `["board", "notes"]`, `["verse_bunches"]`.

