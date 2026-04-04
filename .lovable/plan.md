

## Let Anonymous Users Read the Bible — Auth-Gate Only on Premium Features

### Problem
The KeepRead.ing landing page ("Start Studying — It's Free") forces OAuth sign-in before the user can even see the Bible reader. The reader already auth-gates highlighting, circle gestures, and bookmarks — so there's no reason to block reading.

### Changes

#### 1. KeepReadingShell — Allow anonymous Bible access
**File:** `src/components/keepreading/KeepReadingShell.tsx`

Change the root route from `user ? <Bible /> : <KeepReadingLanding />` to always render `<Bible />`. The landing page becomes a separate `/welcome` route that users can visit but aren't forced into.

```
<Route path="/" element={<Bible />} />
<Route path="/welcome" element={<KeepReadingLanding />} />
```

#### 2. KeepReadingLanding — CTA navigates to reader, not OAuth
**File:** `src/pages/KeepReadingLanding.tsx`

- Change "Start Studying — It's Free" button from `handleOAuth("google")` to `navigate("/")`  
- Keep the Apple/Google sign-in buttons below as secondary options for users who want to create an account right away
- Update footer CTA similarly

#### 3. Upgrade auth-gate messages to be warm + benefit-driven
**Files:** `FloatingToolbar.tsx`, `BibleReader.tsx`, `VerseBunchDialog.tsx`

Replace the cold "Sign In Required" copy with uplifting messages that list benefits. Include a sign-in/sign-up button.

**FloatingToolbar.tsx** (mobile sheet + desktop popover for unauthenticated verse selection):
- Title: "You're discovering something beautiful ✦"
- Body: list benefits as short items — Highlight in multiple colors, Circle words for AI cross-references, Save Verse Bunches for topical study, Journal alongside Scripture
- Add a "Create Free Account" button that navigates to `/auth`

**BibleReader.tsx** (underline gesture + X-gesture toasts):
- Replace generic "Please sign in" toasts with: title "Unlock this feature ✦", description listing the specific benefit (e.g. "Highlighting lets you mark and revisit meaningful passages. Create a free account to start.")

**VerseBunchDialog.tsx** — already has decent copy, just warm it up slightly.

#### 4. KeepReadingNav — Add sign-in link for anonymous users
**File:** `src/components/keepreading/KeepReadingNav.tsx`

Show a subtle "Sign In" button in the nav bar when `!user`, linking to `/auth`.

### Files Summary

| File | Change |
|------|--------|
| `src/components/keepreading/KeepReadingShell.tsx` | Let anon users see Bible reader at `/`, landing at `/welcome` |
| `src/pages/KeepReadingLanding.tsx` | CTA → navigate to reader instead of OAuth |
| `src/components/bible/FloatingToolbar.tsx` | Warm auth-gate sheet with benefits list + sign-up button |
| `src/components/bible/BibleReader.tsx` | Upgrade auth-gate toasts with benefit-driven copy |
| `src/components/keepreading/KeepReadingNav.tsx` | Add "Sign In" link for anonymous users |

