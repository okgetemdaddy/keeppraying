

# Cross-Bible Verse Bunch Selection & Fixes

## Overview
Fix the dismiss bug, implement cross-book verse selection that persists across navigation, show selected verses in a live strip above the Bible nav, add per-bunch color coding with a hide toggle, and animated verse additions.

## Changes

### 1. Fix "Nice." / X dismiss bug
**File: `src/components/bible/VerseBunchDialog.tsx`**
- `handleNice` and `onDismiss` already call `setBunchAware()` to set localStorage, but the parent component's `bunchAware` React state never updates.

**File: `src/components/bible/BibleReader.tsx`**
- Change the `onDismiss` handler from `() => setShowBunchDialog(false)` to also call `setBunchAwareState(true)` so the auto-show effect (`useEffect` at line 568) doesn't re-trigger.
- The auto-show effect checks `!bunchAware` — once `bunchAwareState` is true, it won't fire again.

### 2. Cross-book verse selection model
**File: `src/components/bible/BibleReader.tsx`**

Replace the current `selectedVerses: Set<number>` (chapter-scoped) with a new cross-Bible selection structure:

```ts
interface SelectedVerse {
  versionId: number;
  bookUsfm: string;
  bookTitle: string;
  chapterNumber: string;
  verseNumber: number;
  verseText?: string; // snippet for display
}
```

- New state: `crossSelections: SelectedVerse[]` — persists across book/chapter changes.
- Keep `selectedVerses: Set<number>` for current-chapter UI highlighting (derived from `crossSelections` filtered to current chapter).
- **Remove** the `useEffect` that clears `selectedVerses` on chapter change (line 417-423). Instead, only clear `toolbarPos`, `partialSelection`, `noteInputVerse`, and `showBunchDialog`.
- When user taps a verse, add/remove from `crossSelections`. The current-chapter highlight set is derived via `useMemo`.

### 3. Live selected-verse strip
**File: `src/components/bible/SelectedVersesStrip.tsx`** (new)

A compact horizontal scrollable strip shown above the Bible nav when `crossSelections.length > 0`:
- Each selected verse shown as a pill: `"Gen 1:3"` with an `×` button to deselect.
- Clicking the pill navigates to that verse's book/chapter and scrolls to it.
- **Animation**: when a verse is added, the pill animates from the click position (passed via a ref/state) into the strip using `framer-motion` `layoutId` or a custom enter animation (scale-in from bottom).
- When `×` is clicked, pill animates out (scale-out + fade).
- Show a "Create Bunch" button at the end of the strip when 2+ verses are selected.

### 4. Per-bunch color coding
**File: `src/components/bible/BibleReader.tsx`**

- Define a palette of 8 bunch colors (distinct from highlight colors): `["violet", "teal", "amber", "rose", "sky", "lime", "fuchsia", "cyan"]`.
- When rendering `BunchIndicator` and the bunch border, derive the color from the bunch's index in the user's bunches list (stable via bunch ID hash or creation order).
- Each bunch gets a consistent color across the Bible.

**File: `src/components/bible/VerseBunchStrip.tsx`**
- Apply the same bunch color to the strip pills so they match the in-text indicators.

### 5. Hide bunch references toggle
**File: `src/components/bible/BibleReader.tsx`**

- Add a `hideBunchRefs` state (persisted to `localStorage` key `bible_hide_bunch_refs`).
- Add a toggle button in the toolbar area (eye/eye-off icon) labeled "Hide Bunches".
- When active: `BunchIndicator` and bunch border styling are not rendered, and the `VerseBunchStrip` at the top is hidden.
- The `SelectedVersesStrip` (active selections) remains visible regardless.

### 6. Update bunch dialog to work with cross-selections
**File: `src/components/bible/BibleReader.tsx`**

- The auto-show effect watches `crossSelections.length >= 2` instead of `selectedVerses.size >= 2`.
- `handleBunchConfirm` now passes the full `crossSelections` array to `mutations.createBunch` (which needs to handle multi-chapter/book items).

**File: `src/hooks/useBibleMutations.ts`**
- Update `createBunch` mutation to accept an array of `{ versionId, bookUsfm, chapterNumber, verseNumber }` items instead of just `verseNumbers` within a single chapter. Insert one `verse_bunch_item` row per selected verse with its own book/chapter/version.

### 7. Wire everything together

The flow:
1. User selects Gen 1:2 → pill appears in strip, verse highlighted
2. User navigates to James → Gen 1:2 pill stays in strip
3. User selects James 3:4 → second pill appears (animated from click), tooltip auto-shows (if not yet aware)
4. User clicks "Nice." → tooltip closes, `bunchAware` set to true, never auto-shows again
5. User can click "Create Bunch" in the strip → goes directly to form step
6. Created bunch appears in VerseBunchStrip with its assigned color, and verses in-text show colored indicators
7. User can toggle "Hide Bunches" to read without bunch decorations

## Technical Details
- `crossSelections` stored in component state (not persisted to storage — cleared on page leave, which is fine)
- Bunch colors derived from: `BUNCH_COLORS[bunchIndex % BUNCH_COLORS.length]`
- localStorage keys: `bible_bunch_aware`, `bible_hide_bunch_refs`
- The `createBunch` mutation insert loop: one `verse_bunches` row, then N `verse_bunch_items` rows with individual book/chapter/verse/version

