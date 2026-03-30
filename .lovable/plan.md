

## Make the Premium Prayer Card Visible by Default on `/prayer/:id`

### Problem
The prayer card on the `/prayer/:id` page may be rendering as invisible when `card_opacity` is stored as 0 (or a very low value) in the database — the card becomes fully transparent. Additionally, if no background image is set, the card blends into the page background with no visual distinction.

### Fix — One file change

**Edit `src/pages/Prayer.tsx`**

1. **Clamp minimum card opacity to a visible floor** — ensure `cardOpacity` never goes below ~15% when rendering, so the card is always visible as a floating element above the page. The slider can still go to 0, but the rendered card will have a minimum visible presence.

2. **Ensure the `prayer-card-premium` class styling always produces a visible card** — when `cardBgStyle` returns `{}` (default state), the CSS class already handles it. But when `card_opacity` from the DB is 0 or very low, the inline `rgba()` background makes the card disappear entirely. Fix the `cardBgStyle` computation:
   ```ts
   // Clamp rendered opacity so the card is always visible
   const renderAlpha = Math.max(cardOpacity, 15) / 100;
   ```

3. **Keep the three-dot dropdown exactly as-is** — no changes to the `DropdownMenu`, `MoreVertical` trigger, or any of the controls inside it.

### What stays the same
- Three-dot menu with transparency slider + color picker — untouched
- Card layout, padding, typography — untouched  
- Background image rendering — untouched
- All action buttons (like, pray, save, share) — untouched

### Files changed
- **Edit**: `src/pages/Prayer.tsx` — clamp minimum rendered opacity in `cardBgStyle` computation (~2 lines)

