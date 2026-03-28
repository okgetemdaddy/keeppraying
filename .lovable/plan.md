

## Navigation Overhaul for Prayer Board Page

### Current State
The Board page currently crams all controls (theme switcher, standby, circles, family, playlist, classical prayers, testify bird, voice recorder, add prayer, immersive mode) into SiteNav's `rightSlot`, making it cluttered. Mobile shows the same nav with no hamburger.

### Changes

**1. Refactor Board.tsx — Desktop Second Static Bar**

Remove the `rightSlot` prop from `SiteNav` on the Board page. Instead, render a dedicated `BoardControlBar` component directly below SiteNav (still inside the sticky header wrapper). This bar has:

- **Row 1** (flex, spread): Redesigned ThemeSelector (warm/elegant style), StandbyToggle, Circles link, Family link
- **Row 2** (flex): "Add Prayer" button (gold), "Add Playlist" button (outline)
- Styling: `bg-black/20 backdrop-blur-xl border-b border-white/10`, warm spacing, subtle row separator
- Only visible on desktop (`hidden md:block`)

**2. Create `BoardMobileMenu` component** (`src/components/board/BoardMobileMenu.tsx`)

A full-screen overlay triggered by a hamburger icon in SiteNav's `rightSlot` (mobile only on Board page):

- Hamburger button replaces all right-side controls on mobile
- Opens a full-screen menu with `backdrop-blur-2xl` background
- **Unrolled mat animation** using Framer Motion:
  - Container: `scaleY` from 0 to 1 (origin top) with spring physics
  - Each item staggers in with `y` offset + gentle bounce
  - On "land", a subtle opacity ripple wave animates across the background
- Menu items: Theme switcher, Standby, Circles, Family, Add Prayer, Add Playlist, Classical Prayers, Voice Recorder
- Close button (X) in top-right

**3. Update Board.tsx header section**

Replace lines 321-407 with:

```
Desktop:
  <SiteNav dark />   ← no rightSlot, clean nav
  <BoardControlBar>  ← new component, desktop only
    Row 1: ThemeSelector | StandbyToggle | Circles | Family
    Row 2: Add Prayer | Add Playlist
  </BoardControlBar>

Mobile:
  <SiteNav dark rightSlot={<HamburgerButton />} />  ← mobile only
  <BoardMobileMenu ... />  ← full screen overlay
```

The immersive mode toggle wraps both SiteNav and BoardControlBar.

**4. Remove items**
- Remove `Bird` (Testify) icon button entirely from Board header
- Remove `Classical` button from header (move to mobile menu only)
- Remove `VoiceRecorder` from desktop header (keep in mobile menu)
- Remove any collapsible arrows

**5. Files to create/modify**

| File | Action |
|------|--------|
| `src/components/board/BoardControlBar.tsx` | **Create** — desktop-only second bar |
| `src/components/board/BoardMobileMenu.tsx` | **Create** — full-screen hamburger menu with mat animation |
| `src/pages/Board.tsx` | **Modify** — restructure header, remove rightSlot clutter, integrate new components |
| `src/components/SiteNav.tsx` | No changes needed — Board passes different rightSlot per breakpoint |

**6. Animation Detail — Unrolled Mat**

```text
  ┌─────────────────────────┐
  │  SiteNav (logo + ☰)     │  ← hamburger triggers menu
  └─────────────────────────┘
  ┌─────────────────────────┐  ← scaleY(0→1), originY: top
  │  ░░░ blur background ░░░ │     spring: stiffness 180, damping 22
  │                           │
  │   🎨 Theme Switcher       │  ← stagger delay: 0.05 * index
  │   ⏸ Standby Toggle       │     y: 30→0, opacity: 0→1
  │   👥 Circles              │     bounce: type "spring"
  │   🏠 Family               │
  │   ➕ Add Prayer            │
  │   🎵 Add Playlist         │
  │                           │
  │  ─── ripple opacity wave ─│  ← subtle radial gradient pulse
  └─────────────────────────┘       on animation complete
```

**7. Desktop Second Bar Visual**

```text
  ┌──────────────────────────────────────────────────┐
  │ KeepPray.ing    Prayers  Breathe  Testify  More  │  🔔 (👤)
  ├──────────────────────────────────────────────────┤
  │ 🎨 Theme    ⏸ Standby    👥 Circles   🏠 Family │  ← Row 1
  │ ➕ Add Prayer              🎵 Add Playlist        │  ← Row 2
  └──────────────────────────────────────────────────┘
```

Both rows use `bg-black/15 backdrop-blur-xl`, with a `border-b border-white/8` between rows. Buttons styled as ghost with `text-white/70 hover:text-white hover:bg-white/10`, matching the sacred board aesthetic.

