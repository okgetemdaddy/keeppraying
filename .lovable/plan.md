

## BoardV2 Tweaks — 6 Fixes

### 1. Text overflow fix in PrayerCard
**Problem**: Prayer text overflows over the bottom bar. The content div at line 271 uses `overflow-hidden` but the inner `pca-hide-scrollbar` div needs `overflow-y: auto` explicitly so long text scrolls within the content area without visible scrollbars.

**Fix in `src/components/board/PrayerCard.tsx`**:
- Change the text container div (line 271-280) to add `overflow-y: auto` on the inner scrollable div
- The `pca-hide-scrollbar` class already hides the scrollbar chrome; just need to ensure the content area is properly constrained with `min-h-0` on the flex parent

### 2. Hide old MobileTabBar on /boardv2 + fix scroll
**Problem**: The old 3-tab `MobileTabBar` (Prayers/Breathe/Testify) renders globally in `AppShell` (App.tsx line 90), blocking scroll and showing stale nav on `/boardv2`.

**Fix in `src/components/MobileTabBar.tsx`**:
- Add `/boardv2` and `/design-lab` to a hide-list: if `location.pathname` starts with `/boardv2` or `/design-lab`, return `null`

**Fix in `src/pages/BoardV2.tsx`**:
- Add `pb-8` (or appropriate bottom padding) instead of `pb-28` since the old tab bar won't be there
- Ensure the outer container doesn't block scroll (check for `overflow-hidden` on parent)

### 3. Card focus mode (click to expand)
**Problem**: Clicking a card should bring it front-and-center with dimmed/blurred background, current glow but 50% reduced.

**Fix in `src/pages/BoardV2.tsx`**:
- Add `focusedCardId` state
- When a card is tapped (not a button within the card), set `focusedCardId`
- Render a fixed overlay: `bg-black/60 backdrop-blur-sm` covering the screen
- Render the focused `PrayerCard` centered on screen with `position: fixed`, `z-50`, with a reduced outer glow (50% of normal `borderGlow` opacity values)
- Click on overlay dismisses

**Fix in `src/components/board/PrayerCard.tsx`**:
- Add optional `focused` prop that halves the `borderGlow` box-shadow opacity
- Add `onClick` prop for the card shell (distinct from button clicks inside)

### 4. Answered tab shows only testimonies (flipped cards)
**Problem**: "Answered" filter currently doesn't filter properly and should show only cards with testimonies, auto-flipped to the testimony side.

**Fix in `src/pages/BoardV2.tsx`**:
- Query testimonies table to get prayer IDs that have testimonies: `supabase.from('testimonies').select('prayer_id').eq('user_id', user.id)`
- When `filterMode === "answered"`, filter to only cards whose `prayer.id` is in the testimony set

**Fix in `src/components/board/PrayerCard.tsx`**:
- Add `initialFlipped` prop (boolean). When true, card starts flipped to testimony side
- BoardV2 passes `initialFlipped={filterMode === "answered"}` to each card

### 5. Add purple dark background (4th color)
**Problem**: Only 3 dark backgrounds exist. Need a purple option.

**Fix in `src/components/board/prayerCardTheme.tsx`**:
- Add to `DARK_BACKGROUNDS` array:
```ts
{ name: "Royal Purple", bg: "linear-gradient(175deg, #251e30 0%, #1a1520 40%, #12101a 100%)" }
```

### 6. Default all cards to dark theme
**Problem**: Cards should always use the default dark theme from the design lab.

**No code change needed** — `PrayerCard.tsx` already defaults `themeMode` to `"dark"` and `bgIndex` to `0` (line 100-101). This is correct. The theme picker drawer allows changing per-card, which matches the design lab behavior.

---

### Files Changed

| File | Action |
|------|--------|
| `src/components/board/PrayerCard.tsx` | Fix text scroll, add `focused`/`initialFlipped`/`onClick` props |
| `src/pages/BoardV2.tsx` | Add focus mode overlay, fix answered filter with testimony query, fix padding |
| `src/components/MobileTabBar.tsx` | Hide on `/boardv2` and `/design-lab` routes |
| `src/components/board/prayerCardTheme.tsx` | Add Royal Purple to `DARK_BACKGROUNDS` |

