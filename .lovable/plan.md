

# KeepRead.ing — Full Rebranding Implementation (Remaining Work)

## What's Done
- `src/lib/hostDetect.ts` — `isKeepReading()` helper ✅
- `BibleFeaturesTour.tsx` — conditional branding ✅

## What's Left (everything else from the approved plan)

### Step 1: Dual-Shell Routing in `App.tsx`
- When `isKeepReading()`: render a `KeepReadingShell` with only three routes: `/` (Bible), `/auth` (branded auth), `/reset-password`
- All other paths on keepread.ing → redirect to `/`
- Hide PrayerFAB, UrgentPrayerNotifier, community/team modals, MobileTabBar

### Step 2: KeepReadingNav (`src/components/keepreading/KeepReadingNav.tsx`)
- Open-book SVG icon + "KeepRead.ing" CSS wordmark
- Reuse `useSayingsCycle` animation (100% preserved)
- Left hamburger → triggers Prayer Resources drawer
- Right: auth button + notification bell
- Zero KeepPray.ing references

### Step 3: Prayer Resources Drawer (`src/components/keepreading/PrayerResourcesDrawer.tsx`)
- Left slide-out (~320px desktop) / full-screen overlay (mobile)
- Four tabs: Prayer Cards, Voice Cards, Breaths, Classical Prayers
- Compact card grid; tap → full-screen expansion with back/swipe-to-close
- Data from same Supabase tables (user's saved content)

### Step 4: KeepReadingAuth (`src/components/keepreading/KeepReadingAuth.tsx`)
- Branded sign-in/sign-up with KeepRead.ing logo + tagline
- Email+password, Google, Apple — same `supabase.auth` calls
- No mention of KeepPray.ing

### Step 5: SEO & Meta (`src/components/keepreading/KeepReadingHead.tsx`)
- Dynamic `<title>`: "KeepRead.ing — Keep Reading. Go Deeper. | Free Bible Study"
- Meta description, OG tags, Twitter cards
- Self-canonical: `https://keepread.ing/`
- Schema.org structured data (WebApplication + WebPage)
- Dynamic favicon swap (open-book SVG)

### Step 6: Cross-Domain Canonical on KeepPray.ing
- On KeepPray.ing's `/bible` route: inject `<link rel="canonical" href="https://keepread.ing/" />`
- Consolidates Bible SEO signals to KeepRead.ing domain

### Step 7: MobileTabBar Suppression
- `MobileTabBar.tsx`: return `null` when `isKeepReading()`

### Step 8: Bible.tsx Update
- When `isKeepReading()`: use `KeepReadingNav` instead of `SiteNav`

### Step 9: Favicon & PWA
- Generate open-book SVG favicon, swap dynamically via JS on keepread.ing
- PWA manifest variant for KeepRead.ing branding

## Files Summary

| Action | File |
|--------|------|
| New | `src/components/keepreading/KeepReadingNav.tsx` |
| New | `src/components/keepreading/PrayerResourcesDrawer.tsx` |
| New | `src/components/keepreading/KeepReadingAuth.tsx` |
| New | `src/components/keepreading/KeepReadingHead.tsx` |
| Modify | `src/App.tsx` — dual-shell routing |
| Modify | `src/pages/Bible.tsx` — conditional nav |
| Modify | `src/components/MobileTabBar.tsx` — suppress on keepread.ing |
| Modify | `src/components/SiteNav.tsx` — cross-domain canonical on /bible |

## What Stays Untouched
- BibleReader, Bible Sleeve, dark mode, OLED toggle, trash bin — all intact
- Sayings cycle — preserved (logo text changes only)
- Color palette — identical
- All KeepPray.ing routes/UI — unaffected
- Supabase tables/auth — shared, no DB changes

## User Action Required
- Connect `keepread.ing` and `www.keepread.ing` domains in Lovable project settings → Domains
- Verify both domains in Google Search Console separately

