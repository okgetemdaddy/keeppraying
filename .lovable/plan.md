

## Theme Sanctuary — Build Plan

### Overview
Replace the existing small ThemeSelector dropdown in the hero with a new full "Theme Sanctuary" modal. A lantern icon in the hero triggers a reverent, full-featured theme picker with 8 preset themes, custom colors, scope control, and live preview.

### Architecture Decision
The request says to save theme data to `profiles` with new columns (`theme_preset`, `theme_bg`, `theme_text`, `theme_accent`, `theme_scope`). However, the project already uses a dedicated `board_preferences` table with a `theme` column. To stay consistent with the existing architecture, I will:
- Add the new columns (`theme_preset`, `theme_bg`, `theme_text`, `theme_accent`, `theme_scope`) to the **`board_preferences`** table instead of `profiles`
- Keep the existing `theme` column for board background themes (Golden Sunrise, Candlelit Chapel, etc.)
- The new Theme Sanctuary columns control **prayer card** color styling (the 8 card-color presets + custom)

### Files to Create/Modify

**1. DB Migration** — Add columns to `board_preferences`:
```sql
ALTER TABLE public.board_preferences
  ADD COLUMN theme_preset text DEFAULT 'golden-sunrise',
  ADD COLUMN theme_bg text DEFAULT NULL,
  ADD COLUMN theme_text text DEFAULT NULL,
  ADD COLUMN theme_accent text DEFAULT NULL,
  ADD COLUMN theme_scope text DEFAULT 'board';
```

**2. `src/components/board/ThemeSanctuaryModal.tsx`** (NEW — ~400 lines)
- Brand-new standalone component, no reuse of ThemeSelector
- Props: `isOpen`, `onOpenChange`, preset data, current selection, `onApply`
- Uses `Dialog` from shadcn (full-screen on mobile via className overrides, max-w-[920px] on desktop)
- Layout:
  - Header with serif text: "Choose the Atmosphere of Your Prayer Closet"
  - **Section 1**: 8 preset theme cards in 2×4 grid (desktop) / 2-col scroll (mobile), each with live mini prayer card previews, hover lift animation, glow ring when selected
  - **Section 2**: "Create Your Own" custom color section with circular swatches for bg, auto-suggested text color, 6 accent options
  - **Section 3**: Scope toggle (segmented control): "This Board Only" | "All My Prayer Cards" | "All Future Cards"
  - **Live Preview Panel**: Right column on desktop / collapsible on mobile showing 3 sample mini prayer cards that update in real-time
- Framer Motion: spring entrance, card hover scale, gentle exit fade
- Dark mode: auto-computed darker variants of the 8 presets

**3. `src/hooks/useBoardPreferences.ts`** — Extend to include new theme fields:
- Add `theme_preset`, `theme_bg`, `theme_text`, `theme_accent`, `theme_scope` to `BoardPrefs` interface
- Fetch and save these alongside existing fields

**4. `src/components/board/PrayerStationHero.tsx`** — Replace ThemeSelector:
- Remove the `ThemeSelector` import and usage from top-right
- Add a Lantern icon button (`Lamp` from lucide) in the same position
- On click, set state to open `ThemeSanctuaryModal`
- Pass through theme change callbacks

**5. `src/pages/Board.tsx`** — Wire up:
- Pass new theme sanctuary props through to hero
- Apply the selected card-level theme colors to `BoardCard` rendering (pass as CSS variables or props)

### Component Structure

```text
PrayerStationHero
  └─ [top-right] Lantern icon button → opens ThemeSanctuaryModal

ThemeSanctuaryModal (Dialog)
  ├─ Header (serif title + subtitle)
  ├─ Body (flex: left content + right preview on desktop)
  │   ├─ Left/Main Column
  │   │   ├─ Section 1: Preset Grid (2×4)
  │   │   │   └─ PresetCard × 8 (mini prayer card previews inside)
  │   │   ├─ Section 2: Custom Color Creator
  │   │   │   ├─ BG swatches (circular)
  │   │   │   ├─ Text color (auto + editable)
  │   │   │   └─ Accent swatches (6 options)
  │   │   └─ Section 3: Scope Toggle (segmented)
  │   └─ Right Column (desktop) / Bottom (mobile)
  │       └─ MiniPrayerBoardPreview (3 sample cards)
  └─ Footer: "Apply" button
```

### Preset Data (built into component)
8 presets as specified: Warm Parchment, Gentle Sage, Heavenly Sky, Golden Sunrise, Graceful Lavender, Soft Peach, Light Olive, Pure Sand — each with bg, text, accent colors.

### Animations
- Modal entrance: spring scale + fade from `{ opacity: 0, scale: 0.95, y: 20 }`
- Preset cards: `hover:scale-105` with elevated shadow
- Selected preset: `ring-2 ring-offset-4` with accent color glow
- Exit: gentle fade out

### What Gets Removed
- `src/components/board/ThemeSelector.tsx` — no longer imported in the hero (file can remain but won't be used)
- The small palette dropdown in PrayerStationHero top-right replaced with lantern icon

