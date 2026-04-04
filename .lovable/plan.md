

## Anonymous Guest Session for Bible Reader

### What we're building
When an anonymous user dismisses the "You're discovering something beautiful ✦" dialog, instead of blocking them on every subsequent interaction, we grant them a temporary "guest session" stored in `sessionStorage`. This lets them use highlights, bookmarks, notes, etc. freely for the rest of that page session — all stored locally only. When they navigate away, reload, or close the tab (and they made changes), a gentle prompt asks them to sign up to save their work.

### Changes

#### 1. FloatingToolbar — Set guest session flag on dismiss
**File:** `src/components/bible/FloatingToolbar.tsx`

- In `handleDismissGuest`, after the toast, set `sessionStorage.setItem("kp_guest_bible_session", "true")`
- Update the `!isAuthenticated` gate: if `sessionStorage.getItem("kp_guest_bible_session")` is `"true"`, skip the auth-gate UI entirely and render the normal `ToolbarActions` instead (same as authenticated users)
- This means the benefit dialog only shows once per page session

#### 2. BibleReader — Track guest changes + beforeunload / navigation prompt
**File:** `src/components/bible/BibleReader.tsx`

- Add a `guestHasChanges` ref (or state) that flips to `true` whenever an unauthenticated user performs a highlight, bookmark, note, or bunch action
- Add a `beforeunload` event listener that fires only when `!user && guestHasChanges` — the browser will show its native "Leave site?" prompt
- Add a small `AlertDialog` (already imported in BibleReader) that shows when the user tries to navigate away via React Router (back button, link click) while `!user && guestHasChanges`:
  - Title: "Save your study session?"
  - Body: "Sign up free to keep your highlights, notes, and bookmarks."
  - Two buttons: **"Sign Up"** → navigate to `/auth` | **"Not right now"** → proceed with navigation
- Remove the individual "Unlock this feature ✦" toasts for underline/edit gestures when guest session is active (since they're now allowed)

#### 3. BibleReader — Remove per-action auth blocks during guest session
**File:** `src/components/bible/BibleReader.tsx`

- In the underline gesture handler and edit-highlight handler, check for guest session flag before showing the "Unlock" toast — if guest session is active, allow the action (it will be local-only since Supabase mutations require auth and will gracefully no-op or store locally)

### Files Summary

| File | Change |
|------|--------|
| `src/components/bible/FloatingToolbar.tsx` | Set `kp_guest_bible_session` in sessionStorage on dismiss; skip auth-gate when flag is set |
| `src/components/bible/BibleReader.tsx` | Track guest changes, add beforeunload + navigation prompt, allow actions during guest session |

