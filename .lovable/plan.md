

## KeepPray.ing Complete Overhaul — Implementation Plan

### Immediate Build Fixes (ship first)

1. **Move `PrayerCardAsset.tsx`** from project root to `src/components/board/PrayerCardAsset.tsx` (DesignLab imports from `@/components/board/PrayerCardAsset`)
2. **Move `TestimonyCanvasAsset.tsx`** from project root to `src/components/board/TestimonyCanvasAsset.tsx` (PrayerCardAsset imports from `./TestimonyCanvasAsset`)
3. **Fix `supabase/functions/donation-webhook/index.ts` line 3** — change `npm:@supabase/supabase-js@2.57.2` to `https://esm.sh/@supabase/supabase-js@2`

---

### Phase 1: Foundation (this implementation cycle)

This is a large overhaul. The plan breaks it into discrete, shippable units executed in order. Each phase builds on the previous.

#### 1A. Canonical PrayerCard Component

**New file: `src/components/board/PrayerCard.tsx`**

Rebuild from `PrayerCardAsset.tsx` as the single production prayer card:

- Add `variant` prop: `"full" | "compact" | "preview" | "shared" | "embed"`
- Add `prayer` prop (Supabase `prayer_cards` row) replacing hardcoded demo data
- Add `savedMeta` prop for pin/favorite/position/notes
- Add `isOwner` prop controlling owner-only actions (edit, delete, privacy toggle)
- Add `themeOverride` prop (optional, defaults to board theme bridge)
- Add `onAction` callback for parent-level event handling
- Wire all Supabase mutations currently in BoardCard (prayed, share, delete, pin, font, etc.)
- Scripture section, testimony flip, dust particles, TTS — all from PrayerCardAsset design
- Responsive menus: DropdownMenu on desktop, ResponsiveSheet on mobile

**What this replaces**: BoardCard, PrayerViewerModal, DrawerPrayerCard, PrayerCardLink popover, PrayerCard3D, PrayerDraftCard (all become `PrayerCard` with the appropriate variant)

#### 1B. "Pray Now" Creation Sheet

**New file: `src/components/PrayNowSheet.tsx`**

Full-screen vaul drawer (92vh) with three input modes:

- **Type**: contenteditable with formatting toolbar (from MobileWritePrayerDrawer)
- **Speak**: mic activation with waveform + live transcript (from VoiceRecorder core logic)
- **Draw**: ink canvas (from usePencilTools / HandwritingEngine)
- No title field — AI generates title via `enrich-prayer` edge function
- Default status: `private`
- On save: instant card creation, background enrichment (scripture, labels, meditation)
- Post-save: "Share with someone?" prompt or "Done"

**What this replaces**: PrayerMethodChooser → AddPrayerModal → MobileWritePrayerDrawer chain, VoiceRecorder full-screen overlay

#### 1C. BoardV2 — "Your Prayer Space"

**New file: `src/pages/BoardV2.tsx`** (~200 lines target)

- Minimal header: avatar + greeting + streak badge + search + bell + settings gear
- Daily verse (1 line, from `daily-welcome` edge function or cached saying)
- Stats bar: streak flame + active prayer count
- Full-width single-column card stack (mobile), 2-col masonry (desktop, max-width 800px)
- Filter chips: All | Pinned | Shared | Answered
- Sort dropdown: Recent | Most Prayed | Oldest
- Center `+` button opens PrayNowSheet
- Data layer: reuse `fetchSaved` pattern, `useBoardPreferences`, IDB cache
- Uses `PrayerCard variant="full"` for each card

#### 1D. New Navigation

**Modify: `src/components/MobileTabBar.tsx`**

New 5-item layout:
```
[ Board ]  [ Explore ]  [ + ]  [ Circles ]  [ Profile ]
```

- Center `+` is elevated, opens PrayNowSheet
- Board = `/boardv2`
- Explore = `/prayers` (community prayers, search)
- Circles = `/circles`
- Profile = `/profile`

**Modify: `src/components/SiteNav.tsx`** (desktop)

Simplified: `[KeepPray.ing logo]  Board  Explore  Circles  [search]  [bell]  [avatar]`

No "More" dropdown. Support/Help in avatar menu. Admin stays at `/admin`.

#### 1E. Route Changes in `src/App.tsx`

- Add `/boardv2` → `BoardV2` (guarded, playground)
- Add `/design-lab` → `DesignLab` (keep as isolated sandbox)
- Keep all existing routes — nothing removed yet

---

### Phase 2: Social (next cycle)

- Reimagine shared prayer landing (`SharedPrayerLanding.tsx`) — instant prayer experience with `PrayerCard variant="shared"`
- Rebuild Circles as lightweight shared prayer threads (strip homework, schedules, admin complexity)
- Merge FamilyRooms into Circles with a "Family" tag
- Testimony moves to card flip only (kill standalone `/testify` page later)

### Phase 3: Intelligence (following cycle)

- PrayerWatch OS — extend `useActivityLogger` with new event types + read-back for personalization
- Vector search infrastructure (`content_vectors` table, `vector-search` edge function)
- PrayerAssist as omnipresent bottom sheet (not standalone page)
- Soft delete architecture (`deleted_at` column, archive view, 90-day cleanup cron)

### Phase 4: Polish (final cycle)

- Strip scrapped features (Games, Blog, WarRoom, PrayTheWorld, BibleCanvas, LaunchOverlay, SermonSync)
- Hide on-hold features from nav (Classical, Breathe standalone, Sermon Plans)
- Performance audit (lazy loading, code splitting)
- Desktop responsive pass
- iOS Capacitor prep

---

### Files Changed (Phase 1)

| File | Action |
|------|--------|
| `PrayerCardAsset.tsx` (root) | **Move** to `src/components/board/PrayerCardAsset.tsx` |
| `TestimonyCanvasAsset.tsx` (root) | **Move** to `src/components/board/TestimonyCanvasAsset.tsx` |
| `supabase/functions/donation-webhook/index.ts` | **Fix** import |
| `src/components/board/PrayerCard.tsx` | **NEW** — canonical card component |
| `src/components/PrayNowSheet.tsx` | **NEW** — unified prayer creation |
| `src/pages/BoardV2.tsx` | **NEW** — cards-first board |
| `src/components/MobileTabBar.tsx` | **Modify** — new 5-tab layout |
| `src/components/SiteNav.tsx` | **Modify** — simplified desktop nav |
| `src/App.tsx` | **Modify** — add `/boardv2` and `/design-lab` routes |

### What Is NOT Changing (Phase 1)

- `/board` and `Board.tsx` — untouched, stays live
- `BoardCard.tsx` — untouched until PrayerCard is proven on `/boardv2`
- All Supabase tables and edge functions — no schema changes
- Bible/KeepRead.ing — untouched
- Auth flow — untouched
- Profile page — untouched

