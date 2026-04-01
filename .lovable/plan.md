

# Rename "Pray the World" → "Prayer Warriors" + Ensure Region Data Flows Through

## What changes

### 1. Rename everywhere
All references to "Pray the World" / "We Pray" become **"Prayer Warriors"**:

| File | Change |
|------|--------|
| `src/pages/PrayTheWorld.tsx` | Page title "🌍 We Pray" → "🌍 Prayer Warriors"; tab label "We Pray" → "Prayer Warriors" |
| `src/components/SiteNav.tsx` | Nav label "We Pray" → "Prayer Warriors", description updated |
| `src/components/PrayerFAB.tsx` | FAB label "We Pray" → "Prayer Warriors" |
| `src/components/FeatureShowcase.tsx` | Headline/body copy updated |
| `src/App.tsx` | Route `/we-pray` → `/prayer-warriors`; add redirect from `/we-pray` and `/pray-the-world` to `/prayer-warriors` |

### 2. Auto-detect region (from previously approved plan)
- **Migration:** Add `region text` column to `profiles`
- **New `src/lib/regionDetect.ts`:** Extract `getNearestRegion()` from LocalRadar + add `detectUserRegion()` that checks church lat/lng → address parsing → browser geolocation fallback
- **New `src/hooks/useAutoRegion.ts`:** On auth, check profile.region; if null, run detection and save it
- Wire into `AuthContext.tsx` or Board-level

### 3. Region auto-attached to prayers
- `AddPrayerModal.tsx` — remove manual region picker; read `userRegion` from profile and attach on insert
- Same for voice-to-prayer flow if applicable

### 4. Ensure region data feeds Prayer Warriors page
The existing `usePrayerMapData` hook already aggregates `prayer_cards.region` — no change needed there. With auto-region on profiles, new prayers will have regions populated, which flows directly into the WorldMap hotspots and the Prayer Warriors page stats.

### 5. PrayerMethodChooser + AddPrayerModal redesign (previously approved)
- New `PrayerMethodChooser.tsx` — Speak It / Write It
- Redesigned single-column `AddPrayerModal` — remove preview, remove left column, live text style on textarea
- Wire into `Board.tsx`

## Files touched

| File | Action |
|------|--------|
| Migration SQL | Add `region` to `profiles` |
| `src/lib/regionDetect.ts` | New — shared region detection |
| `src/hooks/useAutoRegion.ts` | New — auto-detect + save region |
| `src/components/board/PrayerMethodChooser.tsx` | New — Speak/Write chooser |
| `src/components/AddPrayerModal.tsx` | Redesign + remove region picker + auto-attach region |
| `src/pages/Board.tsx` | Wire chooser + pass region |
| `src/pages/PrayTheWorld.tsx` | Rename title/labels |
| `src/App.tsx` | Update routes |
| `src/components/SiteNav.tsx` | Rename nav item |
| `src/components/PrayerFAB.tsx` | Rename FAB item |
| `src/components/FeatureShowcase.tsx` | Update copy |
| `src/components/map/LocalRadar.tsx` | Import shared `getNearestRegion` |

