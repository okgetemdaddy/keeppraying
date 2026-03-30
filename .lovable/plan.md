

## Scope the Transparency Slider to the Prayer Card Only

The transparency slider and color presets must only affect the `prayer-card-premium` card element on `/prayer/:id` — not the page background, not the fixed background image, not the nav bar.

### How it works

**File: `src/pages/Prayer.tsx`**

The page structure is:
1. Fixed background image (line 290-300) — **untouched**
2. `relative z-10` content wrapper (line 302) — **untouched**
3. `motion.div.prayer-card-premium` (line 311-316) — **this is the target**

**Implementation:**

1. **Add DB migration** — two columns on `prayer_cards`:
   ```sql
   ALTER TABLE public.prayer_cards
     ADD COLUMN card_opacity real DEFAULT 1.0,
     ADD COLUMN card_color jsonb DEFAULT NULL;
   ```

2. **Add imports** to `Prayer.tsx`:
   - `MoreVertical`, `SunDim`, `Check`, `Palette` from lucide
   - `Slider` from `@/components/ui/slider`
   - `DropdownMenu` components
   - `CARD_BG_PRESETS` from `@/components/board/BoardCard`

3. **Add state**: `cardOpacity` (0-100), `cardBgPreset`, `isOwner`

4. **Restructure the `prayer-card-premium` div only**:
   - Make the `motion.div` wrapper `position: relative; overflow: hidden; background: transparent`
   - Add an **inner** absolute-positioned background layer inside the card:
     ```tsx
     <div className="absolute inset-0 rounded-2xl" style={{
       backgroundColor: cardBgPreset?.bg ?? '#F8F1E3',
       opacity: cardOpacity / 100,
     }} />
     ```
   - All text content sits above this layer via `relative z-10` — stays fully opaque
   - Footer action bar gets its own background with `opacity: Math.max(cardOpacity / 100, 0.8)`

   The page background, fixed image, nav, and everything outside the card remain completely unaffected.

5. **Three-dot menu** — positioned in the card header next to `SourceBadge`, only visible to `isOwner`:
   - Card Transparency slider (0-100%)
   - Card Color presets (8 swatches + default)

6. **Persistence**:
   - Owner saves to `prayer_cards.card_opacity` and `prayer_cards.card_color`
   - Non-owners see creator styling read-only
   - Board cards remain independently controlled via `user_saved_prayers`

### Key constraint
The slider **only** controls the opacity of the card's inner background layer. The fixed page background image, the gradient overlay on the background image, the nav bar, and all text remain at full opacity.

