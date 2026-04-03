

# Harden Bible Search-to-Verse Navigation

## Current State

Most of this feature already exists:
- Inline search input → opens `BibleSearchDialog` (Command palette with AI, notes, bunches, references)
- `handleSearchNavigate` sets `pendingScrollVerseRef` → MutationObserver scrolls to verse
- `animate-verse-glow` golden animation fires after scroll

## What's Missing (from the prompt)

The prompt specifies several hardening improvements not yet implemented:

### 1. Animation cleanup via `animationend` instead of blind `setTimeout`
Currently uses `setTimeout(() => el.classList.remove(...), 2200)`. The prompt requires `animationend` event listener with `will-change` cleanup and a safety timeout fallback.

### 2. Cancel previous highlight on rapid re-search
No mechanism to clear a previous glow if the user quickly searches again. Need to track the currently-glowing element and remove its class before starting a new scroll.

### 3. `prefers-reduced-motion` support
Add a CSS media query that replaces the scale/box-shadow animation with a simple background fade for users who prefer reduced motion.

### 4. Accessibility attributes
- Search input: `role="searchbox"`, `aria-label="Search Bible verses"`
- Results list: `aria-live="polite"` with result count announcement
- Highlighted verse: `aria-current="true"` during glow

## Changes

### `src/components/bible/BibleReader.tsx` (scroll effect, ~lines 974-1013)

- Track currently-glowing element in a ref (`glowingElRef`)
- Before applying glow to new element, remove class from previous element
- Replace `setTimeout` cleanup with `animationend` listener + safety timeout
- Set `will-change: transform` before animation, clear to `auto` on end
- Set `aria-current="true"` during glow, remove after

### `src/index.css` (verse-glow class)

- Add `will-change: transform` to `.animate-verse-glow`
- Add `@media (prefers-reduced-motion: reduce)` block that uses a background-color transition instead of scale/box-shadow animation

### `src/components/bible/BibleSearchDialog.tsx`

- Add `role="searchbox"` and `aria-label` to the search input
- Wrap result list in `aria-live="polite"` region with result count

## Files Changed

| File | Change |
|------|--------|
| `src/components/bible/BibleReader.tsx` | Harden glow lifecycle: animationend cleanup, cancel previous, will-change, aria-current |
| `src/index.css` | Add will-change + prefers-reduced-motion fallback to verse-glow |
| `src/components/bible/BibleSearchDialog.tsx` | Add accessibility attributes to search input and results |

