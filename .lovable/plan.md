

## Prayer Station Layout + Testimony Journey Overhaul

### 1. Hero Section Rearrangement

**PrayerStationHero.tsx** changes:

- **Title** stays at the top: `"{firstName}'s Prayer Station"`
- **Standby toggle** moves directly under the title with label text: "Are you available to pray for live prayer requests today?"
- **Daily welcome message** stays below standby
- **Action buttons** (2x3 grid) remain
- **Search bar** moves into the hero section at the bottom (removed from Board.tsx main content area). Hero section expands to accommodate it.
- **Theme picker** positioned top-right of the hero section (absolute positioned)

Props added to PrayerStationHero: `searchQuery`, `onSearchChange`, `onThemeChange`, `currentTheme`, `animationsEnabled`, `onAnimationsToggle`

**Board.tsx** changes:
- Remove the standalone search bar from main content area
- Pass search state + theme props into PrayerStationHero
- Remove ThemeSelector and StandbyToggle from the desktop control row (they live in hero now)

### 2. Double-Tap to Flip Card to Testimony Side

**BoardCard.tsx** changes:
- Add an `onDoubleClick` / `onTouchEnd` (double-tap detection) handler on the card front face that triggers `setFlipped(true)` — flips to testimony side
- Keep existing single-tap behavior (opens PrayerViewerModal via `onOpenViewer`)
- Double-tap detection: track last tap timestamp, if second tap within 300ms, flip instead of opening viewer

### 3. Testimony Updates + Faith Journey Tracking

**DB migration** — create `testimony_updates` table:
```sql
CREATE TABLE public.testimony_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  testimony_id uuid NOT NULL REFERENCES public.testimonies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.testimony_updates ENABLE ROW LEVEL SECURITY;
-- Users can CRUD own updates
CREATE POLICY "Users manage own testimony updates" ON public.testimony_updates
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

Also add `answered_date` column to `testimonies`:
```sql
ALTER TABLE public.testimonies ADD COLUMN answered_date date DEFAULT NULL;
```

### 4. Testimony Card Face Overhaul (TestimonyCardFace.tsx)

When a testimony exists and the card is flipped:
- Show `answered_date` at the top (editable date picker — defaults to `created_at`)
- Show testimony title + body
- Below the testimony body: an **"Update"** button that reveals a large text field to add a new update
- List existing updates chronologically, each with its `created_at` date
- **"Back to Prayer"** button at the bottom of the card
- Together these dated entries form the "faith journey" for this prayer

When no testimony exists:
- Show the existing "Be the first to testify" layout (TestifyBack component) — no change

### 5. Files Modified/Created

| File | Action |
|---|---|
| `PrayerStationHero.tsx` | Add search bar, standby toggle, theme picker |
| `Board.tsx` | Remove standalone search bar, pass new props to hero, remove desktop ThemeSelector/StandbyToggle row |
| `BoardCard.tsx` | Add double-tap/double-click flip handler |
| `TestimonyCardFace.tsx` | Add answered_date display/edit, updates list, update form, "Back to Prayer" button |
| DB migration | Create `testimony_updates` table + add `answered_date` to `testimonies` |

