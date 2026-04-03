

# Premium iPadOS Redesign — Suggestions & Bugs Panel

## Summary
Complete visual overhaul of `BibleSuggestionSheet.tsx` to match native iPadOS material design: frosted glass container, iOS segmented control toggle, borderless inputs with inner shadows, warm metallic submit button, and a sleek footer note replacing the boxed info block.

## Technical Changes

### `src/components/bible/BibleSuggestionSheet.tsx` — Full rewrite

**1. Container & Materials**
- Override `SheetContent` className to remove default `bg-background` and apply frosted glass: `bg-white/5 backdrop-blur-[24px] backdrop-brightness-[0.8] border-r border-white/10`
- Remove all `border-border` references; use `border-white/10` throughout

**2. Header**
- Drop `SheetDescription` entirely (no sub-text)
- Make title slightly smaller (`text-[0.95rem]`) but heavier (`font-bold tracking-tight`)
- Mute the Lightbulb icon to `text-amber-400/70`

**3. iOS Segmented Control**
- Replace the two separate pill buttons with a single pill-shaped container (`rounded-full bg-white/5 p-1`)
- Inside: two segments that share a sliding highlight `div` (absolutely positioned, `rounded-full bg-white/15`, animated with `transition-all duration-200`)
- Active segment text is `text-white`, inactive is `text-white/50`

**4. Borderless Inputs**
- Title input: remove `border`, apply `bg-white/5 shadow-inner` with `rounded-lg`, placeholder at `opacity-40`
- Textarea: remove all borders, apply `bg-white/[0.03]` with `shadow-[inset_0_1px_3px_rgba(0,0,0,0.2)]`
- Dot-grid: reduce opacity from 12% to 3% (`hsl(var(--muted-foreground) / 0.03)`)
- Move "Apple Pencil supported" micro-copy inside the textarea as an absolutely positioned element at `bottom-2 right-3`, `opacity-40`, that fades out when `message.length > 0`
- Labels at `opacity-60`

**5. Submit Button**
- Replace default blue with warm metallic gold: `bg-amber-700/30 border border-amber-500/20 text-amber-200/90`
- Hover state: `hover:bg-amber-600/50 hover:text-amber-100`
- Disabled state: `opacity-30`

**6. Footer Note (replaces boxed info block)**
- Remove the entire `rounded-xl bg-muted/50` card with cross/heart SVGs
- Replace with a left-aligned paragraph below the submit button area:
  - Small muted text (`text-[0.65rem] text-white/40 leading-relaxed`)
  - Inline minimalist feather/spark SVG icon (12px) at the start
  - Copy: "Every suggestion is prayerfully considered by our team. Bugs are fixed as soon as we know about them. Thank you for helping refine this space."

**7. Thank-you State**
- Keep the same structure but adapt colors to frosted glass theme: `text-white/90` heading, `text-white/50` body

**8. Sign-in Warning**
- Restyle to `text-amber-400/70` on glass background

### No other files change — only `BibleSuggestionSheet.tsx`.

| File | Change |
|------|--------|
| `src/components/bible/BibleSuggestionSheet.tsx` | Full visual redesign to iPadOS frosted glass aesthetic |

