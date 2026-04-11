

## Convert Board Cards to Premium PrayerCardAsset Design

### Completed

**Phase 1: Shared Theme Primitives**
- Created `src/components/board/prayerCardTheme.tsx` — single source of truth for `CardTheme` type, `THEME_DARK`/`THEME_LIGHT`, backgrounds, Google Fonts, SVG icons, luminance detection, and `buildCardTheme()` bridge
- Created `src/components/board/DustParticles.tsx` — CSS `@keyframes` particles (no framer-motion), IntersectionObserver gated, mobile-throttled (10 vs 16)
- Created `src/components/board/BarBtn.tsx` — themed icon button accepting `CardTheme`

**Phase 2: BoardCard Visual Rewrite**
- Replaced flat `rounded-2xl` shell with 3D perspective `rounded-3xl` + ambient glow pulse + inner glow + lamp light + dust particles
- Added `KEEPPRAY.ING` brand text (10px, uppercase, gold, tracking 0.22em) above title
- Implemented theme bridge: cards inherit board theme via luminance detection, brand colour from `--board-accent`
- Premium bottom bar with themed `BarBtn` icons matching PrayerCardAsset layout
- Scripture & Meditation collapsible strip between content and bottom bar
- Responsive ••• menu: `DropdownMenu` on desktop (≥1024px), `ResponsiveSheet` drawer on mobile
- Background images layer correctly under inner glow/lamp light/dust with existing overlay opacity slider
- Back face (testimony) gets inner glow treatment matching front

**Phase 3: PrayerCardAsset Updated**
- Refactored to import shared primitives from `prayerCardTheme.tsx` and `DustParticles.tsx`
- Removed ~200 lines of duplicated constants

### What Was NOT Changed
- No board features removed (stats, sermon plans, verse bunches, calendar, sort/filter, playlist builder all remain)
- No per-card independent dark/light toggle by default (cards inherit board theme)
- All Supabase queries, TTS, flip/testify, prayed actions, font picker — untouched
- `Board.tsx` layout and chrome — untouched

### Files Changed

| File | Change |
|------|--------|
| `src/components/board/prayerCardTheme.tsx` | **NEW** — shared CardTheme system |
| `src/components/board/DustParticles.tsx` | **NEW** — CSS-only dust particles |
| `src/components/board/BarBtn.tsx` | **NEW** — themed icon button |
| `src/components/board/BoardCard.tsx` | Full visual rewrite with premium shell |
| `PrayerCardAsset.tsx` | Updated to import from shared files |
