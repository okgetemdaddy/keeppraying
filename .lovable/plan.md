

## Fix: Restore Prayer Card Background + Three-Dot Menu Visibility

### Problem
The last edit removed the `prayer-card-premium` class from the card wrapper and set `background: "transparent"`, which stripped away the white/parchment card background, border, shadow, and glassmorphism effects. The card text now sits directly on the background image with no visible card.

The three-dot menu also only shows for `isOwner` (creator), which may be why it's not visible on this particular card.

### Fix — `src/pages/Prayer.tsx`

**1. Restore `prayer-card-premium` class on the `motion.div` wrapper (line 351)**

Remove the inline `style={{ background: "transparent" }}` and bring back the `prayer-card-premium` class. The inner absolute background layer approach was wrong — it removed the card's identity.

**2. Use rgba background on the card itself for transparency control**

Instead of a separate inner div with opacity, apply the transparency directly to the card's background color using `rgba`. This keeps the card's border, shadow, and `::before` highlight intact while making just the fill color transparent.

- When `cardOpacity` is 100: card looks normal (solid parchment or preset color)
- When slider is lowered: card background becomes see-through, background image shows through
- Text, border, shadow all remain fully visible

The `motion.div` will get:
```tsx
className="prayer-card-premium flex flex-col"
style={{
  background: `rgba(${r}, ${g}, ${b}, ${cardOpacity / 100})`,
}}
```

Where `r,g,b` comes from the selected preset color or default parchment (#F8F1E3 = 248,241,227).

**3. Remove the inner absolute background div** (lines 354-361) — no longer needed.

**4. Keep `relative z-10` wrapper for content** (line 363) but remove the z-10 since we no longer have an inner bg layer to sit above.

**5. Footer action bar** — add its own background with `Math.max(cardOpacity / 100, 0.8)` opacity so it stays legible.

**6. Three-dot menu** — show for all logged-in users who have saved the prayer (`isOwner || saved`), not just owners. Owners save to `prayer_cards`, non-owners who've saved can adjust for their session. (Or keep owner-only per original spec — but the user needs to be the owner to see it.)

### Helper: hex-to-rgb utility

Add a small helper to convert hex/preset colors to rgb values for the rgba() background:
```ts
function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}
```

Default parchment: `hexToRgb('#F8F1E3')` = `"248, 241, 227"`.

### Summary of changes
- Single file: `src/pages/Prayer.tsx`
- Restore `prayer-card-premium` class on the card wrapper
- Control transparency via `rgba()` background instead of a separate opacity div
- Keep text, border, shadow fully opaque at all slider values
- Three-dot menu remains positioned in header next to SourceBadge

