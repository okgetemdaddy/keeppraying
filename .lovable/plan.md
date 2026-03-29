

# Redesign Verse Bunch Discovery Flow

## Overview

Replace the current `VerseBunchDialog` (two-step prompt/form) with a new tooltip-style awareness flow. When 2+ verses are selected, a floating tooltip educates the user about Verse Bunches. Two CTAs: "Nice." (acknowledge) and "Try Creating a Verse Bunch Now" (proceeds to creation). Unauthenticated users get a gentle sign-in nudge that remembers their pending bunch through the auth flow. Created bunches appear on `/board` and above the Bible nav bar.

## Changes

### 1. Rewrite `VerseBunchDialog` → `VerseBunchTooltip`
**File: `src/components/bible/VerseBunchDialog.tsx`**

Replace entirely with a new component that has three possible states:

- **`awareness`** (default, first time): Floating tooltip explaining Verse Bunches — "Bundle verses from anywhere in the Bible for use in Circles, Family Rooms, or personal study." Two buttons: **"Nice."** (dismisses, sets localStorage `bible_bunch_aware = true`) and **"Try Creating a Verse Bunch Now"** (proceeds to `form` step if signed in, or `signin` step if not).

- **`signin`**: Gentle sign-in prompt — "Sign in to save your Verse Bunch and unlock highlights, notes, prayer boards, and more." CTA links to `/auth` with a `returnTo` query param. Pending bunch data (verses, book, chapter, version) is saved to `sessionStorage` under `pending_verse_bunch` so it survives the auth redirect.

- **`form`**: The existing name/description form (kept as-is from current implementation).

The `awareness` step only shows once per device (localStorage). After acknowledgment, future 2+ verse selections skip straight to the Bunch button in the FloatingToolbar (existing behavior) without re-showing the tooltip.

### 2. Update `BibleReader.tsx` bunch flow
**File: `src/components/bible/BibleReader.tsx`**

- Replace `VerseBunchDialog` import with new `VerseBunchTooltip`.
- When `showBunchDialog` is true and user hasn't acknowledged yet (`bible_bunch_aware` not set), show `awareness` state.
- After awareness is acknowledged, the "Bunch" button in `FloatingToolbar` works as before (direct to form).
- On mount, check `sessionStorage` for `pending_verse_bunch`. If found and user is now authenticated, auto-trigger bunch creation, then clear sessionStorage. This completes the "remember through sign-in" flow.
- Remove old `bunchDialogDismissed` / `isBunchDialogDismissed` state — replace with `bible_bunch_aware` check.

### 3. Add Verse Bunches strip above Bible nav
**File: `src/components/bible/BibleReader.tsx`**

- Above the sticky toolbar, render a horizontal scrollable strip of the user's Verse Bunches (fetched from `verse_bunches` table).
- Each chip shows bunch name + verse count. Tapping navigates to the first verse reference in that bunch (setting version/book/chapter and scrolling to verse anchor).
- Only shown when user is signed in and has at least one bunch.
- Clean, compact design: small pills with violet accent, horizontally scrollable.

### 4. Add Verse Bunches section to `/board`
**File: `src/pages/Board.tsx`**

- Add a new "Verse Bunches" section (collapsible) showing the user's bunches as cards.
- Each card displays: bunch name, description (if any), verse count, verse references preview (e.g. "Genesis 1:1-3, Psalm 23:1-6").
- Tapping a bunch card navigates to `/bible` with query params to load the first verse reference.
- Position this section after the Prayer Station Hero and before the main prayer cards grid.
- Fetch from `verse_bunches` joined with `verse_bunch_items` to get verse details.

### 5. Site-wide "remember intent through sign-in" pattern note
The `sessionStorage` pattern used here (`pending_verse_bunch`) establishes the convention for other features (add prayer, prayer assist, breath, testimonies). Each feature stores its pending action in sessionStorage before redirecting to `/auth`, then checks on mount after auth completes. This plan only implements it for Verse Bunches — the same pattern will be applied to other features in a future phase.

## Technical Details

- **localStorage key**: `bible_bunch_aware` — tracks whether user has seen the awareness tooltip (replaces `bible_bunch_dialog_dismissed`)
- **sessionStorage key**: `pending_verse_bunch` — JSON object `{ versionId, bookUsfm, chapterNumber, verseNumbers, returnPath }` stored before auth redirect
- **Auth redirect**: Navigate to `/auth?returnTo=/bible` so after sign-in the user returns to the Bible reader
- **Board fetch**: New query in Board.tsx using `supabase.from('verse_bunches').select('*, verse_bunch_items(*)').eq('user_id', user.id)` 
- **Bible nav strip fetch**: Reuse data from `useBibleChapterData` for current chapter bunches, plus a separate lightweight query for all user bunches

