

# iPhone Swipe-Free Navigation Mode

## What Gets Built

A toggle in the mobile Bible Sleeve that lets iPhone users disable swipe-to-change-chapters. When disabled, two arrow buttons (◀ ▶) appear flanking the chapter title in the reading header, providing tap-based chapter navigation instead. This clears the gesture space for the planned long-press + drag quick-highlight feature.

## User Experience

1. Open Bible Sleeve on iPhone → new toggle: **"Tap to change chapters"** (off by default)
2. When enabled: horizontal swipe on the reading area no longer changes chapters; two compact arrow buttons appear beside "Genesis 1" in the sticky header
3. Preference persisted to `localStorage` so it survives sessions

## Technical Details

### 1. State + persistence in `BibleReader.tsx`

- New state: `tapNavMode` with `localStorage` key `bible_tap_nav` (default `false`)
- When `tapNavMode` is true, the `motion.div` wrapping verses gets `drag={false}` instead of `drag="x"`
- The chapter header renders `ChevronLeft` / `ChevronRight` buttons flanking the title when `tapNavMode` is true

### 2. Header arrows (`BibleReader.tsx`)

Replace the static `<h1>` with a flex row when `tapNavMode` is active:

```tsx
<div className="flex items-center justify-center gap-3">
  {tapNavMode && (
    <button disabled={!canPrev} onClick={() => setChapterIdx(i => i - 1)}>
      <ChevronLeft />
    </button>
  )}
  <h1>Genesis 1</h1>
  {tapNavMode && (
    <button disabled={!canNext} onClick={() => setChapterIdx(i => i + 1)}>
      <ChevronRight />
    </button>
  )}
</div>
```

### 3. Bible Sleeve toggle (`BibleSleeveSheet.tsx`)

- New props: `tapNavMode: boolean`, `onToggleTapNav: (v: boolean) => void`
- Add a Switch toggle in the Navigation/Reading section (only visible when `isIPhone`): **"Tap to change chapters"** with description "Use arrow buttons instead of swiping"

### 4. Swipe disable logic (`BibleReader.tsx`)

The existing `drag={studyMode ? false : "x"}` becomes:

```tsx
drag={studyMode || tapNavMode ? false : "x"}
```

## Files Changed

| File | Change |
|------|--------|
| `src/components/bible/BibleReader.tsx` | Add `tapNavMode` state, disable drag when active, render arrow buttons in header, pass props to Sleeve |
| `src/components/bible/BibleSleeveSheet.tsx` | Accept `tapNavMode` + `onToggleTapNav` props, render toggle (iPhone-only) |

