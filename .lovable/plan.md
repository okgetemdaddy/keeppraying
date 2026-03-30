

## TTS Loading Popup Above Speaker Button

### What We're Building

A small floating popup that appears directly above the speaker/listen button when TTS is loading, with a two-phase message sequence:

1. **Phase 1** (immediate): "Some prayers take time to load" — fades in, then fades out after ~2s
2. **Phase 2** (2.5s delay): "Warming up the vocal cords…" — fades in where the first message was
3. **Dismiss**: The entire popup instantly disappears the moment `ttsPlaying` becomes true (audio ready)

### Approach

Create a small reusable component `TtsLoadingPopup` and add it to both `Prayer.tsx` and `Prayers.tsx` next to the speaker button.

### New File: `src/components/TtsLoadingPopup.tsx`

- Props: `visible: boolean` (bound to `ttsLoading && !ttsPlaying`)
- Internal state machine with `useEffect` timers:
  - On `visible` becoming true → show message 1, start 2s fade-out timer
  - After fade-out → 0.5s gap → fade in message 2 at 2.5s total
  - On `visible` becoming false → instantly unmount (no exit animation)
- Styled as a small pill/tooltip with a subtle downward-pointing caret, positioned `absolute bottom-full mb-2` relative to the button wrapper
- Warm gold/cream tones matching the prayer card aesthetic
- Uses `framer-motion` `AnimatePresence` for fade transitions between the two messages

### Changes to `src/pages/Prayer.tsx` (lines ~511-530)

- Wrap the Listen button in a `relative` container (like the Prayed button already is)
- Add `<TtsLoadingPopup visible={ttsLoading && !ttsPlaying} />` above the button

### Changes to `src/pages/Prayers.tsx` (lines ~459-479)

- Same pattern: wrap Listen button in `relative` div, add `<TtsLoadingPopup />`

### Technical Details

- Timer cleanup on unmount / `visible` change to prevent stale state
- `whitespace-nowrap` to keep messages on one line
- Popup has `pointer-events-none` so it doesn't interfere with button clicks
- Subtle `backdrop-blur` and semi-transparent warm background

