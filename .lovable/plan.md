

## KeepPray.ing Complete Overhaul

### Phase 1: Foundation — COMPLETED

**Build Fixes**
- Moved `PrayerCardAsset.tsx` → `src/components/board/PrayerCardAsset.tsx`
- Moved `TestimonyCanvasAsset.tsx` → `src/components/board/TestimonyCanvasAsset.tsx`
- Fixed `donation-webhook` import (`npm:` → `https://esm.sh/`)

**1A. Canonical PrayerCard** — `src/components/board/PrayerCard.tsx`
- 5 variants: `full | compact | preview | shared | embed`
- Props: `prayer`, `savedMeta`, `variant`, `isOwner`, `userId`, `themeOverride`, `themeVars`, `onAction`, `onRefresh`
- All Supabase mutations (prayed, pin, share, delete, notes, enrich)
- Theme bridge from board themes, scripture strip, testimony flip, TTS, dust particles
- Responsive menus: DropdownMenu desktop, Drawer mobile

**1B. PrayNowSheet** — `src/components/PrayNowSheet.tsx`
- 92vh vaul drawer with Type | Speak | Draw modes
- No title required — AI generates via enrich-prayer
- Background enrichment (scripture, labels) after save
- Voice mode with Web Speech API live transcription

**1C. BoardV2** — `src/pages/BoardV2.tsx`
- Cards-first layout: compact header → stats → filter chips → card stack
- Full-width mobile, 2-col desktop (max-width 800px)
- Filter: All | Pinned | Shared | Answered
- Sort: Recent | Most Prayed | Oldest
- Stale-while-revalidate with IDB cache
- Floating + FAB opens PrayNowSheet

**1D. Routes** — `src/App.tsx`
- `/boardv2` → BoardV2 (guarded playground)
- `/design-lab` → DesignLab (isolated sandbox)

### What Was NOT Changed
- `/board` and `Board.tsx` — untouched, stays live
- `BoardCard.tsx` — untouched until PrayerCard proven
- All Supabase tables and edge functions — no schema changes
- MobileTabBar / SiteNav — NOT modified yet (deferred to next iteration)
- Bible/KeepRead.ing, Auth, Profile — untouched

### Next Phases (not yet started)
- Phase 2: Social (shared prayer landing, circles rebuild, testimony on flip)
- Phase 3: Intelligence (PrayerWatch OS, vector search, omnipresent PrayerAssist)
- Phase 4: Polish (strip scrapped features, performance, iOS prep)
