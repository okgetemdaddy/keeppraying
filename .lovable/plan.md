
## Plan: Shared Nav, Sign Out, Fix "Get Started" Visibility & Prayers Spacing

### What's changing and why

**1. Create `src/components/SiteNav.tsx`** — a shared navigation component extracted from `Index.tsx`. Every page gets the same full nav: logo, all four links (Prayers, PrayerAssist.ing, KeepFight.ing, KeepGrow.ing), and a session-aware right side.

Right-side logic:
- **Signed out**: "Get Started" gold button → `/auth`
- **Signed in**: "My Board" ghost link + avatar/name dropdown with "Sign Out" option

The nav starts frosted (`bg-card/80 backdrop-blur`) on non-hero pages by default, and supports an optional `transparent` prop (for pages with dark hero backgrounds like Index) plus an optional `rightSlot` prop for page-specific controls (Board's theme/arrange/playlist/add-prayer buttons).

Mobile drawer shows all four nav links plus the signed-in/out CTA — no hover-only states.

---

**2. Update `Index.tsx`**
- Replace the inline `<motion.nav>` block with `<SiteNav transparent scrollBehavior />`.
- Wrap the "Get Started" button inside `{!session && ...}` so it is hidden when signed in. The `SiteNav` component handles this internally, so Index just uses the component.

---

**3. Update `Board.tsx`**
- Replace the `<motion.header>` section (ArrowLeft + "My Prayer Board" text + right controls) with `<SiteNav rightSlot={<BoardControls />} dark />`.
- The Board-specific controls (ThemeSelector, Arrange, Playlist, Add Prayer, Immersive toggle) move into a `<BoardControls />` fragment passed as `rightSlot`.
- Board nav stays dark/translucent overlay style via `dark` prop.

---

**4. Update `Prayers.tsx`**
- Replace the `<header>` with `<SiteNav />`.
- **Fix spacing**: The "PrayerAssist.ing" button in the current header has `gap-2` container. After moving to SiteNav this won't apply. But the hero section's "Try PrayerAssist.ing" CTA (line ~590–610 area) — need to check and add `gap-3` or `mt-2` between the description text and the button row so they aren't crammed.

---

**5. Update `PrayerAssist.tsx`**
- Replace the `<header>` (ArrowLeft + Sparkles logo) with `<SiteNav />`.
- The Sparkles + "PrayerAssist.ing" branding becomes part of the page body, not the nav, or can be kept as a subtitle in the nav via `rightSlot`.

---

**6. Update `Blog.tsx`**
- Replace the two-link header with `<SiteNav />`.

---

**7. Update `WarRoom.tsx`**
- Replace the ArrowLeft + verse + theme icons header with `<SiteNav dark />`.
- The WarRoom theme icons (Moon/Flame/Sun/Leaf) move into a `rightSlot`.

---

### `SiteNav` component design (key details)

```text
Props:
  transparent?   boolean  — start transparent, frosted on scroll (for Index hero)
  dark?          boolean  — dark/translucent overlay style (for Board, WarRoom)
  rightSlot?     ReactNode — page-specific right-side controls
  scrollBehavior? boolean — enable scroll-based transparent→frosted transition

Session-aware right side (built-in, no extra props needed):
  Signed out  → "Get Started" gold pill button
  Signed in   → "My Board" ghost link + UserMenu dropdown
                UserMenu: avatar circle (initials fallback) → dropdown
                  • My Board  (→ /board)
                  • Sign Out  (calls signOut(), navigates to /)

NAV_LINKS (same as Index):
  Prayers | PrayerAssist.ing | KeepFight.ing | KeepGrow.ing
```

### Spacing fix on `/prayers`

The "Try PrayerAssist.ing" area in the hero/filter section of `Prayers.tsx` — the container div wrapping the description paragraph and button needs its `gap` increased from `gap-2` to `gap-4`, and a `mt-1` added to the Button so there's visible breathing room.

---

### Files changed

| File | Change |
|---|---|
| `src/components/SiteNav.tsx` | **New** — shared nav with session awareness, sign out, rightSlot |
| `src/pages/Index.tsx` | Replace inline nav with `<SiteNav transparent scrollBehavior />` |
| `src/pages/Board.tsx` | Replace header with `<SiteNav dark rightSlot={boardControls} />` |
| `src/pages/Prayers.tsx` | Replace header with `<SiteNav />`; fix spacing on PrayerAssist CTA |
| `src/pages/PrayerAssist.tsx` | Replace header with `<SiteNav />` |
| `src/pages/Blog.tsx` | Replace header with `<SiteNav />` |
| `src/pages/WarRoom.tsx` | Replace header with `<SiteNav dark rightSlot={themeIcons} />` |
