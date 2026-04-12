

## Phase 3: Explore + Circles + Profile Mobile Screens + 3 Missing Features

Phase 1 built the shell, tokens, and nav. Phase 2 built Prayer Card, Pray Now, and Focus Mode. This phase builds the remaining 3 tab screens (Explore, Circles, Profile) to match the mockup, converts existing CTAs to use CSS tokens (keeping their current copy and layout), and implements the 3 features flagged as "not yet built."

---

### Part A — CTA Token Conversion (Style Only, No Restructuring)

Existing CTAs across the app (Auth page buttons, PremiumUpsellSheet, share modals, etc.) keep their current copy, layout, and behavior. Only the styling changes:
- Replace hardcoded Tailwind colors (`bg-amber-500`, `text-slate-900`) with CSS token equivalents (`var(--kp-gold)`, `var(--kp-bg-deep)`)
- Primary buttons: `background: var(--kp-gold); color: var(--kp-bg-deep)`
- Ghost/secondary buttons: `background: var(--kp-bg-elevated); border: 1px solid var(--kp-border-gold); color: var(--kp-gold)`
- Files touched: `Auth.tsx`, `PremiumUpsellSheet.tsx`, `InviteShareModal.tsx`, `SharePrayerModal.tsx`, `CommunityPrayerRequestModal.tsx`, `TeamPrayerRequestModal.tsx`

---

### Part B — Explore Screen (New: `src/pages/ExploreMobile.tsx`)

Mirrors mockup `#screen-explore` exactly:

1. **Rotating brand sayings header** — cycles through `['KeepPray.ing', 'Keep Believing', 'Keep Trusting', 'Keep Hoping', 'Keep Seeking', 'Keep Praising', 'Keep Standing']` with 5s interval + 600ms opacity fade. Uses `useSayingsCycle` but overrides the fallback array with the mockup's brand sayings.

2. **Search bar** — styled per mockup (rounded, muted bg, search icon). Triggers existing Supabase full-text search on `prayer_cards` (public, approved). Hybrid vector search deferred to Phase 4.

3. **Filter chips** — `For You | Trending | Answered | Recent`. "Answered" renders `PrayerCardMobile` with `initialFlipped={true}` per the `@LOVABLE` dev note. "Trending" sorts by `prayed_count DESC` within 7 days. "Recent" by `created_at DESC`.

4. **PrayerAssist CTA card** — gold-accent card with star icon. Taps open the existing `prayer-assist` SSE chat. Copy and layout match mockup line 2111-2121.

5. **Request a Prayer CTA card** — green-accent card with shield icon, 3 mode buttons (Type/Speak/Draw). Inserts into existing `prayer_requests` table. Copy matches mockup line 2123-2147.

6. **Prayer Warriors Online section** — green pulse dot + avatar stack. Wired to the new warrior presence system (Part E).

---

### Part C — Circles Screen (New: `src/pages/CirclesMobile.tsx`)

Mirrors mockup `#screen-circles`:

1. **Header** — "Prayer Circles" + "+" create button
2. **Search bar** — filters circles by name
3. **Circle cards** — each shows emoji avatar, circle name, latest activity snippet, member avatar dots with overflow count
4. **Data query**: `accountability_circles` JOIN `accountability_circle_members` WHERE `user_id = me`, with latest prayer activity from `accountability_circle_prayers`
5. **Tap** → navigates to existing `/circles/:id` detail page
6. All styled with CSS tokens (card bg, borders, text colors from `var(--kp-*)`)

---

### Part D — Profile Screen (New: `src/pages/ProfileMobile.tsx`)

Mirrors mockup `#screen-profile`:

1. **Hero section** — large avatar, name, "Praying since [date]", 3 stat boxes (Prayers count, Day Streak, Testimonies count)
2. **Menu items** (mockup-accurate icons + labels):
   - Faith Journey → placeholder view (Phase 4 PrayerWatch OS)
   - Prayer Archive → existing `useTrashBin` data in a sheet
   - Board Theme → links to existing theme selector
   - Light/Dark toggle → `toggleTheme()` from `themeProvider.ts`
   - Available for Prayer → warrior toggle (Part E)
   - Notifications → placeholder
   - Support KeepPray.ing → links to `/support`
   - Sign Out → `supabase.auth.signOut()`
3. Each menu item uses the mockup's icon + colored icon background pattern

---

### Part E — Prayer Warrior System (Not Yet Built → Full Implementation)

**Database migration:**
```sql
ALTER TABLE profiles ADD COLUMN is_prayer_warrior boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN warrior_status text DEFAULT 'offline';
```

**Realtime Presence channel:**
- New hook `useWarriorPresence.ts` — when `is_prayer_warrior = true` and `warrior_status = 'available'`, user joins Supabase Realtime Presence channel `prayer-warriors`
- Tracks online warrior count + avatar list for the Explore screen
- Profile toggle updates `profiles.is_prayer_warrior` + joins/leaves presence channel

**Auto-circle on accept:**
- When a warrior accepts a `prayer_requests` record, auto-create an `accountability_circles` row + 2 member entries (requester + warrior) for a private 1:1 prayer thread

---

### Part F — Fullscreen Draw Canvas (Not Yet Built → Full Implementation)

New component: `src/components/DrawCanvasFullscreen.tsx`

Matches mockup `#draw-fullscreen` (lines 2680-2759):
- **Toolbar**: Close button + "Draw Your Prayer" title + undo/redo buttons
- **Color bar**: 8 preset color buttons (gold, cream, green, blue, purple, red, yellow, muted) stored in `usePencilTools` Zustand store
- **Thickness bar**: 3 presets (thin=2, medium=4, bold=8) mapped to `perfect-freehand` size
- **Canvas**: Pointer events for cross-device support, `perfect-freehand` + `simplify-js` for pressure-sensitive calligraphy strokes, faint ruled guide lines
- **Tool bar**: Pen (default), Highlighter (semi-transparent, multiply blend), Eraser (tap-to-delete stroke)
- **Save flow**: Export canvas → call `ink-ocr` edge function → extracted text → `prayer_cards.prayer_text` + image → storage bucket
- **Undo/Redo**: `useInkHistory` hook maintains stroke stack
- Launched from the "Draw" mode in `PrayNowSheet`

---

### Part G — Personalized Sayings (Not Yet Built → Implementation)

Enhance `useSayingsCycle.ts`:
- Replace the generic fallback array with the mockup's brand sayings: `['KeepPray.ing', 'Keep Believing', 'Keep Trusting', 'Keep Hoping', 'Keep Seeking', 'Keep Praising', 'Keep Standing']`
- Context-awareness: query user's most recent prayer topics from `prayer_cards` labels. If "healing" is present → bias toward "Keep Believing". If "guidance" → "Keep Seeking". Simple keyword→saying map, no vector search needed.
- Explore header displays the current saying with 600ms opacity fade transition per mockup spec

---

### Part H — Route Wiring

Update `MobileNavV2.tsx` tab paths:
- Explore → `/explore` (new route)
- Circles → `/circles` (new route)  
- Profile → `/profile` (existing route, renders new mobile version)

Add routes in `App.tsx`:
- `/explore` → `ExploreMobile`
- `/circles` → `CirclesMobile`
- Profile page conditionally renders `ProfileMobile` on mobile viewport

---

### Technical Details

**New files (6):**
- `src/pages/ExploreMobile.tsx`
- `src/pages/CirclesMobile.tsx`
- `src/pages/ProfileMobile.tsx`
- `src/components/DrawCanvasFullscreen.tsx`
- `src/hooks/useWarriorPresence.ts`

**Modified files (~10):**
- `src/App.tsx` — new routes
- `src/components/MobileNavV2.tsx` — updated paths
- `src/hooks/useSayingsCycle.ts` — brand sayings + context bias
- `src/pages/Auth.tsx` — token-based button styles
- `src/components/bible/PremiumUpsellSheet.tsx` — token CTA
- `src/components/InviteShareModal.tsx` — token buttons
- `src/components/SharePrayerModal.tsx` — token buttons
- `src/components/PrayNowSheet.tsx` — wire Draw mode to fullscreen canvas
- `src/pages/Profile.tsx` — mobile detection → render ProfileMobile

**Database migration (1):**
- Add `is_prayer_warrior` and `warrior_status` columns to `profiles`

