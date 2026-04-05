

## Full-Screen Bible Sight + Auto-Expanding Textarea

### Changes

#### 1. Bible Sight Drawer — Full-Screen on Mobile + Auto-Expanding Input

**File: `src/components/bible/BibleSightDrawer.tsx`**

- Change drawer height from `h-[80vh]` to `h-[100dvh] max-h-[100dvh]` so it covers the full mobile screen (using `dvh` for correct behavior with mobile browser chrome).
- Replace the single-line `<Input>` with a `<textarea>` that auto-expands as the user types (1 row minimum, ~5 rows max). Use an `onInput` handler that resets `scrollHeight` to auto-size. Style it with `resize-none`, `overflow-hidden` (until max), rounded corners, matching the current look.
- Change `handleKeyDown` to submit on Enter (without Shift) and allow Shift+Enter for newlines.
- Change `inputRef` from `HTMLInputElement` to `HTMLTextAreaElement`.
- Add `visualViewport` resize listener to adjust bottom padding when the mobile keyboard opens.

#### 2. PrayerAssist — Auto-Expanding Textarea Fix

**File: `src/pages/PrayerAssist.tsx`**

The `<Textarea>` already exists (line 365) with `min-h-[48px] max-h-32 resize-none rows={1}`, but it doesn't actually auto-expand — it stays at 1 row. Add an `onInput` auto-resize handler that sets `style.height = 'auto'` then `style.height = scrollHeight + 'px'`, capped at the max-h. This makes it grow dynamically as the user types, matching modern chat UX.

### Files Changed

| File | Change |
|------|--------|
| `src/components/bible/BibleSightDrawer.tsx` | Full-screen drawer (100dvh); replace `<Input>` with auto-expanding `<textarea>`; keyboard-aware padding |
| `src/pages/PrayerAssist.tsx` | Add auto-resize `onInput` handler to existing `<Textarea>` |

