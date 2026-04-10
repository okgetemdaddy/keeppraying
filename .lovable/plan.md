

## Fix 3D Prayer Card: Depth, Readability, and Bleed-Through

### Problems Identified (from screenshot)

1. **Text bleed-through** — both card faces are visible simultaneously because `backfaceVisibility: "hidden"` alone isn't sufficient; the card faces need an opaque background to fully occlude the reverse side
2. **Cursive font too hard to read** — the `Caveat` cursive font on the prayer front is illegible at this size
3. **Flat edges** — no depth cues like shadow, inner border, or edge highlights to give the card a physical, premium feel

### Changes

**File: `src/components/LaunchOverlay.tsx`** — `PrayerCard3D` component only

1. **Fix bleed-through**: Add `-webkit-backface-visibility: hidden` alongside `backfaceVisibility: "hidden"` on both faces. Ensure both face `div`s have a fully opaque background (no transparency in the base layer). Add `will-change: transform` and `transform: translateZ(0)` to the front face to force GPU compositing.

2. **Replace cursive font**: Change the prayer text from `fontFamily: "'Caveat', cursive"` and `italic` to `Georgia, serif` with normal weight — elegant but fully readable. Remove the `italic` class.

3. **Add depth and edge detail**:
   - Outer `box-shadow` with multiple layers: a close dark shadow for depth + a subtle gold glow for warmth
   - Inner border highlight using `ring` or `shadow-[inset_...]` to simulate edge lighting
   - A subtle top-edge gradient line (1px) in gold to catch "light"
   - Slightly rounded corners with a thicker border on both faces

| Area | Before | After |
|------|--------|-------|
| Font | Caveat cursive, italic | Georgia serif, normal |
| Bleed | Text visible through reverse | Opaque backgrounds + webkit prefix |
| Depth | Flat card, thin border | Multi-layer shadow, inner glow, edge highlight |

