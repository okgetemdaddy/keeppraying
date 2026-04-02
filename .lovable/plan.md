

# Delete Feature Tour + Add KeepRead.ing Landing Page

## Two changes

### 1. Delete BibleFeaturesTour

Remove the "Welcome to KeepRead.ing" bottom sheet that appears on first verse click.

**Files:**
- **Delete** `src/components/bible/BibleFeaturesTour.tsx`
- **`BibleReader.tsx`**: Remove the `showTour` state, `tourSeen` ref, `pendingTourVerse` ref, `handleTourAcknowledge` callback, the tour-gating logic inside the verse click handler, and the `<BibleFeaturesTour>` JSX + import.

### 2. Create KeepRead.ing Landing Page

A dark, premium marketing page at `/` for unauthenticated visitors on the `keepread.ing` domain. Authenticated users go straight to the Bible reader.

**New file: `src/pages/KeepReadingLanding.tsx`**

- Dark zinc-950 background, emerald accent, serif headings
- **Hero**: "Keep Reading. Go Deeper." headline, subtitle about iPad Bible study + Apple Pencil, primary CTA ("Start Studying — It's Free"), Google/Apple OAuth buttons wired to `lovable.auth.signInWithOAuth`
- **Bento grid** (4 cards): Spatially Aware Ink (PenTool, span-2), Voice to Verse (Mic), Verse Bunches (Layers), Bible Pocket (Bookmark, span-2) — all using Lucide icons
- **Authority section**: "Designed for the deep journaler" with descriptive copy
- **Footer CTA**: Repeat sign-up button + "No credit card required"
- Framer Motion fade-up animations throughout
- Fully responsive: single column on mobile (430px viewport), grid on desktop

**Modified file: `src/components/keepreading/KeepReadingShell.tsx`**

- Import `useAuth` and `KeepReadingLanding`
- Route `/` renders `KeepReadingLanding` for unauthenticated users, `Bible` for authenticated users (simple ternary or wrapper component)
- All other routes unchanged

**OAuth wiring**: The Google/Apple buttons call `lovable.auth.signInWithOAuth("google"|"apple")` directly from the landing page — same pattern as `KeepReadingAuth.tsx`. On success, auth state changes → shell re-renders → user lands in Bible reader.

## Files summary

| File | Action |
|------|--------|
| `src/components/bible/BibleFeaturesTour.tsx` | Delete |
| `src/components/bible/BibleReader.tsx` | Remove tour state, refs, logic, JSX, import |
| `src/pages/KeepReadingLanding.tsx` | Create — dark marketing landing page |
| `src/components/keepreading/KeepReadingShell.tsx` | Gate `/` route on auth state |

