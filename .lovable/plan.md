

## Teleprompter Captions with Progressive Visibility

### What We're Building

Replace the static scrollable caption block with a **teleprompter-style auto-scrolling caption** system where:
- Only **~3 lines** are visible at a time in a fixed-height window
- The **current line** being spoken is brightest (full opacity gold/cream)
- **Already-spoken lines** above fade out as they scroll up and away
- **Upcoming lines** start dim and **gradually brighten** as their turn approaches — the next line is fairly visible, two lines ahead is dimmer, three lines ahead is very faint
- Lines auto-advance on a timer estimated from word count, adjusted by `playbackRate`
- Smooth `translateY` scrolling with framer-motion spring transitions
- Top and bottom CSS `mask-image` gradient for soft edge fading

### Single File Change

**`src/components/TtsContemplationOverlay.tsx`**

1. Add `useState`, `useEffect`, `useRef`, `useMemo` imports
2. **Split text into lines** — break on sentence boundaries (`. ` / `! ` / `? `) or every ~10 words, whichever comes first
3. **Timer-driven auto-advance** — estimate ~150ms per word at 1× speed; divide total estimated duration by line count to get ms-per-line interval. Recalculate when `playbackRate` changes. Reset `currentLineIndex` to 0 when `playing` becomes true.
4. **Replace the `<ScrollArea>` caption block** with a fixed-height container (~90px, 3 lines) using `overflow: hidden` and `maskImage: linear-gradient(transparent 0%, black 12%, black 88%, transparent 100%)`
5. **Render all lines** inside a `motion.div` that animates `y: -currentLineIndex * lineHeight` with a smooth spring
6. **Opacity per line** based on distance from `currentLineIndex`:
   - `distance === 0` (current): opacity `0.95` — brightest
   - `distance === -1` (just spoken): opacity `0.45`
   - `distance <= -2` (past): opacity `0.15`
   - `distance === +1` (next up): opacity `0.6` — fairly visible, brightening
   - `distance === +2`: opacity `0.35`
   - `distance >= +3`: opacity `0.15` — barely visible
   - Each line uses `motion.p` with `animate={{ opacity }}` and a 0.6s ease transition so brightness changes feel gentle
7. Current line also gets a subtle `scale: 1.02` to emphasize it

### No other files change — props remain the same.

