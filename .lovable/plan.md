

# Fix Verse Bunch Tooltip Auto-Show and Verse Count

## Problems
1. The tooltip only appears after clicking the "Bunch" button — it should auto-appear when 2+ non-consecutive verses are selected (and user hasn't acknowledged awareness yet).
2. The tooltip shows "0 verses" because `selectedArr` is computed but the dialog state triggers before the selection state fully propagates.

## Changes

### 1. Auto-show tooltip on multi-verse selection
**File: `src/components/bible/BibleReader.tsx`**

Add a `useEffect` that watches `selectedVerses.size`. When it reaches 2+ and `bunchAware` is false, automatically set `showBunchDialog = true`. This replaces the current flow where the dialog only opens on "Bunch" button click for unaware users.

```ts
useEffect(() => {
  if (selectedVerses.size >= 2 && !bunchAware) {
    setShowBunchDialog(true);
  }
}, [selectedVerses.size, bunchAware]);
```

### 2. Fix 0-verse bug in tooltip
**File: `src/components/bible/BibleReader.tsx`**

The issue: `showBunchDialog` is set to `true` inside `handleCreateBunchRequest` which also captures `selectedVerses` via closure, but the tooltip reads `selectedArr` (derived from `selectedVerses`). When triggered from the Bunch button, the `selectedVerses` Set may be getting cleared or stale.

Fix: Store the selected verses for the bunch dialog in a separate ref/state when opening the dialog, so the tooltip always has the correct verse list regardless of selection changes. Alternatively, ensure the `selectedArr` memo stays stable while the dialog is open by not clearing selection when dialog opens.

Specifically: in `handleCreateBunchRequest` and in the new auto-show effect, capture the current verses into a `bunchDialogVerses` state. Pass `bunchDialogVerses` to `VerseBunchTooltip` instead of `selectedArr`. Also update `handleBunchConfirm` to use `bunchDialogVerses`.

```ts
const [bunchDialogVerses, setBunchDialogVerses] = useState<number[]>([]);

// In the auto-show effect:
useEffect(() => {
  if (selectedVerses.size >= 2 && !bunchAware) {
    setBunchDialogVerses([...selectedVerses].sort((a, b) => a - b));
    setShowBunchDialog(true);
  }
}, [selectedVerses.size, bunchAware]);

// In handleCreateBunchRequest (for aware users clicking Bunch button):
const handleCreateBunchRequest = useCallback(() => {
  if (selectedVerses.size < 2) return;
  setBunchDialogVerses([...selectedVerses].sort((a, b) => a - b));
  setShowBunchDialog(true);
}, [selectedVerses]);

// In handleBunchConfirm — use bunchDialogVerses instead of selectedVerses:
mutations.createBunch.mutate({
  bunchName,
  verseNumbers: bunchDialogVerses,
  description,
});
```

Pass `bunchDialogVerses` to `VerseBunchTooltip` instead of `selectedArr`.

### 3. Keep "Bunch" button in FloatingToolbar for aware users
No changes needed — once `bunchAware` is true, the auto-show effect won't fire, and the Bunch button in FloatingToolbar continues to work as before via `handleCreateBunchRequest`.

