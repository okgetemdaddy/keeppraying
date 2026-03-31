

# Fix: 404 on "Add a Prayer" + Graceful Not-Found Page

## Problem
The floating action button's "Add a Prayer" navigates to `/prayer` — a route that doesn't exist. The route `/prayer/:id` exists (for viewing a specific prayer), but `/prayer` alone falls through to the 404 page. Additionally, the current 404 page is bare and shows a blunt "404" number.

## Changes

### 1. Fix the broken navigation (`src/components/PrayerFAB.tsx`)
Change line 227 from `navigate("/prayer")` to `navigate("/board")` — this takes the user to their Prayer Board, which is where the "Add Prayer" modal lives and will auto-open. Alternatively, navigate to `/prayers` (the public prayers list page which also has an Add Prayer modal).

The board route is the better destination since that's the user's personal prayer space.

### 2. Redesign the Not-Found page (`src/pages/NotFound.tsx`)
Replace the current minimal 404 with a graceful, spiritually-toned page — no numbers, no "404":

- Warm, centered layout with a subtle icon (e.g., a compass or dove)
- Heading like **"This path doesn't seem to lead anywhere"**
- Subtext: *"Even when we feel lost, God knows exactly where we are."*
- A Scripture reference (e.g., Psalm 32:8 — "I will instruct you and teach you in the way you should go")
- A "Return Home" button styled consistently with the app
- A secondary "Go to Prayer Board" link
- Soft background consistent with the app's sacred aesthetic

### Files Modified

| File | Change |
|------|--------|
| `src/components/PrayerFAB.tsx` | Fix navigation from `/prayer` → `/board` |
| `src/pages/NotFound.tsx` | Replace with graceful, number-free not-found page |

