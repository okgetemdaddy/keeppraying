

# Add Verse Glow Animation After Search Navigation

## Current State

Everything is already wired for verse-level navigation:
- Each verse element has `id="verse-{number}"` and `data-verse="{number}"`
- `handleSearchNavigate` sets `pendingScrollVerseRef.current = verse` which triggers a `scrollIntoView` via MutationObserver
- Search results (reference, AI, notes, bunches) all pass `verseStart`/`verseNumber` through `onNavigate`

The only missing piece: **after scrolling to the verse, nothing visually highlights it**. The verse just scrolls into view silently.

## Changes

### 1. Add a glow keyframe animation to `tailwind.config.ts`

Add a `verse-glow` keyframe: a warm golden pulse that scales subtly, glows via `box-shadow`, then fades back to normal over ~2 seconds.

### 2. Update the scroll-to-verse effect in `BibleReader.tsx` (lines 974-1008)

After `scrollIntoView` succeeds, add the `animate-verse-glow` CSS class to the target verse element. Set a timeout to remove it after the animation completes (~2s). This creates a smooth "found it" moment — the verse glows warmly then returns to normal.

### 3. Add the animation class in `src/index.css`

Define `.animate-verse-glow` with the keyframe reference and a `rounded-md` style so the glow has soft edges around the verse text.

## Files Changed

| File | Change |
|------|--------|
| `tailwind.config.ts` | Add `verse-glow` keyframe + animation |
| `src/components/bible/BibleReader.tsx` | Add glow class to verse element after scroll completes |

