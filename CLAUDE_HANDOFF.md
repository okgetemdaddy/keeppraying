# 🙏 KeepPray.ing — Claude Handoff Document
> **Last updated:** April 11, 2026 @ 4:05 PM EST  
> **Session:** Design Lab — Prayer Card UI/UX Refinement  
> **Author:** Claude (Antigravity IDE)  
> **Picking up in:** Claude Code

---

## What Is This File?

This is a self-addressed handoff document. I (Claude, in Antigravity IDE) am writing this so that I (Claude, in Claude Code) can pick up exactly where we left off. The user is moving their workflow and wants continuity.

---

## Project Overview

**KeepPray.ing** is a faith-based prayer application. The user is building a premium, mobile-first prayer experience. The current focus has been the **Design Lab** (`/design-lab` route) where we've been refining the `PrayerCardAsset` component — a self-contained, themeable, interactive prayer card that will be placed on user boards.

The project uses:
- **Vite + React + TypeScript**
- **Tailwind CSS** for utility styling
- **framer-motion** for animations
- **vaul** for drawer components (mobile-first bottom sheets)
- **lucide-react** for icons
- **Supabase** (planned backend — not yet connected)

---

## Key Files

### Primary Components
| File | Purpose |
|------|---------|
| `src/components/board/PrayerCardAsset.tsx` | **THE main file.** ~1260 lines. The prayer card front face with all drawers, bottom bar, scripture section, theme system. |
| `src/components/board/TestimonyCanvasAsset.tsx` | The "back face" of the prayer card. Shows testimonies, compose modes (type/speak/write), expandable testimony cards. |
| `src/components/board/PrayerStationHero.tsx` | The Design Lab page layout with app bar and navigation. |
| `src/pages/DesignLab.tsx` | Route component that renders the PrayerStationHero. |

### Styling
| File | Purpose |
|------|---------|
| `src/index.css` | Global styles including `pca-hide-scrollbar`, `pca-breathe`, `pca-glow-pulse` keyframes, and card animation utilities. |

---

## Architecture: PrayerCardAsset.tsx

### Theme System (Dual-Mode)
The card has a fully self-contained theme system. It does NOT depend on the parent page background.

```
themeMode: "dark" | "light"
bgIndex: 0 | 1 | 2
```

**Dark Mode Backgrounds:**
- `0` = Deep Brown (warm earth — default)
- `1` = Charcoal (neutral gray)
- `2` = Navy (deep blue)

**Light Mode Backgrounds:**
- `0` = Ivory (warm cream)
- `1` = Pure White
- `2` = Warm Beige (parchment)

Each theme defines ~20 color properties: `cardBg`, `borderSolid`, `lampLight`, `dustColor`, `textColor`, `headingColor`, `barBg`, `brandColor`, `iconDefault`, `iconActive`, `drawerBg`, `drawerText`, `drawerMuted`, `drawerCardBg`, `drawerBorder`, `drawerHandle`, `drawerInputBg`, `drawerBtnPrimary`, `titleColor`, `innerGlow`.

**Important:** The card is designed to be "board-ready" — it renders its own background, borders, glow effects, and can be placed on ANY parent container without visual dependency.

### Font System
- 12 Google Fonts (6 serif + 6 sans-serif) loaded dynamically
- Font picker drawer with real-time preview
- Per-prayer font selection (stored in `fontFamily` state)
- Fonts: Cormorant Garamond, EB Garamond, Playfair Display, Lora, Libre Baskerville, Merriweather, Inter, Outfit, DM Sans, Nunito, Poppins, Source Sans 3

### Card Structure (Front Face)
```
┌─────────────────────────────────────┐
│  Inner Glow (inset box-shadow)      │
│  Lamp Light (top-down gradient)     │
│  Dust Particles (floating)          │
│                                     │
│  KEEPPRAY.ING (brand)               │
│  A Prayer for Provision (title)     │
│  [Prayer text body...]              │
│                                     │
│  ┌─ Scripture & Meditation (5) ──┐  │  ← Collapsible, expands up to 50vh
│  │ 📖 Isaiah 41:10  📖 2Tim 1:7 │  │    Shows verselink badges + full text
│  │ 📖 Phil 4:6-7  📖 Ps 27:1    │  │    Clicking a verselink prompts:
│  │ Isaiah 41:10 — "Fear not..."  │  │    "Open on KeepRead.ing?"
│  └───────────────────────────────┘  │
│  ┌─ Bottom Bar ──────────────────┐  │
│  │ 🔴 🙏 💬  |  📌 ↗ 🔊 👤✓ ••• │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### Bottom Bar Icons (left → right)
| Position | Icon | Function |
|----------|------|----------|
| Left 1 | 🔴/🟢 Status light | Privacy toggle (red=private, green=public) |
| Left 2 | 🙏 Praying hands | "Prayed" toggle with bounce animation |
| Left 3 | 💬 Message | Opens comments drawer |
| Right 1 | 📌 Pin | Pin to user's board |
| Right 2 | ↗ Share | Opens share drawer (Send to Friend / Form Prayer Circle) |
| Right 3 | 🔊 Volume | Read aloud (TTS) |
| Right 4 | 👤✓ Testify | Flips card to testimony backside |
| Right 5 | ••• More | Opens options drawer |

### Card Structure (Back Face — TestimonyCanvasAsset)
- Pulsing glory light + celebration particles
- Testimony list with praise 🙌 and bookmark icons
- Expandable testimonies (click → fills card)
- Compose testimony: Type / Speak / Write modes
- Handwriting canvas with stylus/Apple Pencil detection
- Back button flips card to front

### Drawers (Bottom Sheets via Vaul)
All drawers use the shared `drawerContentCls`, `drawerStyle`, and `handleStyle` for consistent theming.

| Drawer | Trigger | Height | Description |
|--------|---------|--------|-------------|
| Comments | 💬 icon | auto | Threaded comments with avatars |
| Options (3-dot) | ••• icon | auto | Main options menu |
| Share | ↗ icon | 85vh | Send to Friend / Form Prayer Circle |
| Privacy | 🔴 status light | auto | Public/Private toggle with anonymous option |
| Font Picker | 3-dot → Change Font | 75vh | 12 Google Fonts with live preview |
| Theme Picker | 3-dot → Change Theme | auto | Dark/Light toggle + 3 background presets |
| Journal Entry | 3-dot → Journal Entry | **92vh** | Full-screen: Type/Speak/Write modes. ALWAYS private. |
| Add Photos | 3-dot → Add Photos | **92vh** | Full-screen: Camera/Gallery upload with captions |
| Enrich with Scripture | 3-dot → Enrich | 85vh | KeepPray.ing Prayer Assist + Manual add |

### 3-Dot Menu Order
1. **Go to Prayer Circle** (green, emerald) — navigate to circle view
2. **Save to Prayer Room** (gold, heart icon) — save to devotional space
3. **Enrich with Scripture** (gold, sparkle icon) — Prayer Assist or manual verse add
4. **Grid (2-col):**
   - Private Share → opens Share drawer
   - Journal Entry → opens full-screen Journal drawer
   - Add Photos → opens full-screen Photos drawer
   - Change Theme → opens Theme Picker
   - Change Font → opens Font Picker

---

## @LOVABLE Dev Notes System

**CRITICAL CONTEXT:** The user is designing in this codebase but plans to implement the production version using **Lovable AI** (lovable.dev). Every feature that needs a backend service has `@LOVABLE:` comment blocks throughout the code.

These dev notes follow a consistent format:
```tsx
/*
  @LOVABLE: FEATURE NAME
  Service: supabase.from('table').method(...)
  - Bullet point descriptions of behavior
  - Database schema hints
  - API endpoint signatures
*/
```

### All @LOVABLE Tags (complete inventory)

| Tag | File | Service |
|-----|------|---------|
| PRIVACY TOGGLE | PrayerCardAsset | `prayers.update({ is_public, is_anonymous })` |
| PRAYED BUTTON | PrayerCardAsset | `prayer_interactions.upsert()` |
| COMMENTS DRAWER | PrayerCardAsset | `prayer_comments.select()` + realtime |
| PIN TO BOARD | PrayerCardAsset | `board_pins.upsert()` |
| SHARE PRAYER | PrayerCardAsset | `prayer_shares.insert()` + encrypted edge fn |
| TEXT-TO-SPEECH | PrayerCardAsset | Web Speech API or cloud TTS |
| FLIP TO TESTIMONY | PrayerCardAsset | `testimonies.select()` |
| SAVE TO PRAYER ROOM | PrayerCardAsset | `prayer_room.upsert()` |
| ENRICH WITH SCRIPTURE | PrayerCardAsset | `POST /api/prayer-assist/enrich` |
| PRIVATE SHARE | PrayerCardAsset | Same as Share drawer |
| JOURNAL ENTRY | PrayerCardAsset | `journal_entries.insert()` — always private |
| ADD PHOTOS | PrayerCardAsset | `supabase.storage('prayer-photos')` |
| CHANGE THEME | PrayerCardAsset | `prayer_settings.upsert({ theme_mode, bg_index })` |
| CHANGE FONT | PrayerCardAsset | `prayer_settings.upsert({ font_family })` |
| GO TO PRAYER CIRCLE | PrayerCardAsset | `prayer_circles.select('*, members(*)')` |
| VERSELINK | PrayerCardAsset | Auto-transform verse refs → interactive links |
| SCRIPTURE & MEDITATION | PrayerCardAsset | `prayer_verses.select()` + Prayer Assist |
| PHOTO UPLOAD | PrayerCardAsset | Storage upload + `prayer_photos.insert()` with `is_background` |
| TESTIMONY CANVAS | TestimonyCanvasAsset | Full file-level doc block |
| LOAD TESTIMONIES | TestimonyCanvasAsset | `testimonies.select()` |
| POST TESTIMONY | TestimonyCanvasAsset | Type/Speak/Write modes with audio + stroke data |
| PRAISE REACTION | TestimonyCanvasAsset | `testimony_praises.upsert()` |
| BOOKMARK TESTIMONY | TestimonyCanvasAsset | `prayer_room_items.insert()` |
| PENCIL DETECTION | TestimonyCanvasAsset | `pointerType === 'pen'` auto-switch |

---

## User's Naming Conventions & Preferences

- **No mention of "AI" on the site.** Use "KeepPray.ing Prayer Assist" instead.
- **"KeepRead.ing"** is the companion Bible reading app. Verse references are **"verselinks"** that auto-transform into interactive links. Clicking prompts: "Open [ref] on KeepRead.ing for further study?"
- **Prayer Room** = personal devotional space (for revisiting). **Board** = display wall (for pinning).
- The saying: *"God loves when you pray His word back to Him."*
- Bottom sheet drawers, not modals. Mobile-first always.
- Aesthetic: "godly glorious glow," warm tones, breathing/alive animations.
- The watermark (PrayingHandsIcon SVG in background) was **intentionally removed**. Any background image will be a user-uploaded photo.

---

## What Was Just Completed (This Session)

1. ✅ Dual-mode theme system (Light/Dark + 3 backgrounds each)
2. ✅ Theme picker drawer with mode toggle + color swatches
3. ✅ Pin icon added to bottom bar (before Share)
4. ✅ "Save to Prayer Room" added to 3-dot menu
5. ✅ Comprehensive `@LOVABLE` dev notes on ALL features
6. ✅ Collapsible Scripture & Meditation section above bottom bar
7. ✅ "Enrich with Scripture" in 3-dot menu (KeepPray.ing Prayer Assist + Manual)
8. ✅ Verselink click behavior (confirm → navigate to KeepRead.ing)
9. ✅ Journal Entry → full-screen drawer (92vh) with Type/Speak/Write
10. ✅ Add Photos → full-screen drawer (92vh) with Camera/Gallery/Captions
11. ✅ Watermark removed from card background
12. ✅ Scripture section dynamically expands (up to 50vh, shrinks for fewer verses)
13. ✅ All "AI" references renamed to "Prayer Assist"

---

## What's NOT Done Yet (Next Steps)

### Backend Integration (Lovable AI)
- None of the `@LOVABLE` services are connected. All UI is mock/static.
- Supabase schema needs to be created for all tables referenced in dev notes.
- Real-time subscriptions for comments and prayer interactions.

### Functionality Not Yet Wired
- **Pin button** — has no toggle state yet (just `onClick={() => {}}`)
- **Read Aloud (TTS)** — icon exists, no speech synthesis connected
- **Journal Entry Save** — drawer works, no persistence
- **Photo Upload** — drawer works, no file picker / upload logic
- **Prayer Assist Enrich** — drawer works, no API call
- **Comment posting** — input exists, no submit logic
- **Share Now / Copy Link** — buttons exist, no sharing logic
- **Testimony posting** — compose UI works, no save logic

### Design Refinements Still Possible
- Background image support (upload photo → set as card bg via `is_background` flag)
- Test that a background image doesn't break the card layout
- Prayer Circle view/page (navigated to from 3-dot menu)
- User profile avatars in comments (currently mock initials)

---

## Dev Server

```bash
cd "j:\Designs Arise\KeepPray.ing"
npm run dev
# Runs on http://localhost:8080
# Design Lab at /design-lab
```

---

## File Size Warning

`PrayerCardAsset.tsx` is ~1260 lines and ~71KB. It's a single large component with many drawers inlined. If refactoring, consider extracting:
- Individual drawer components (JournalDrawer, PhotosDrawer, EnrichDrawer, etc.)
- Theme system into a separate hook (`usePrayerCardTheme`)
- Scripture section into its own component

But for now, it works and the user has been iterating rapidly in the design lab, so monolithic is fine for speed.

---

*This document was written by Claude (Antigravity IDE) for Claude (Claude Code). Good luck, me.* 🙏
