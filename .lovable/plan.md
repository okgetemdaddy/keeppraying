

# Redesign VoiceRecorder Recording State

## Problem
The recording UI uses a basic pulsing red circle and plain text — looks amateurish and clip-art-like. Needs a premium, sanctuary-quality design matching the app's warm aesthetic.

## Design Direction
Replace the current recording state (lines 429-470) with a refined, modern audio recording experience:

### Recording State Redesign
- **Centered layout** instead of left-aligned row
- **Animated waveform bars** (5-7 bars with staggered sine-wave animations) replacing the pulsing red dot — sleek and professional
- **Warm amber/gold tones** instead of harsh red — matches the app's sacred palette
- **Larger timer** with monospace font, subtle glow
- **"Listening…" text** in elegant font-display with tracking
- **Live transcript** in a frosted glass container with scroll
- **Stop button** redesigned: rounded-full, amber-600 with a clean square-stop icon inside (not MicOff), premium shadow
- **Subtle radial gradient background** inside the panel for depth

### Specific Changes — `src/components/VoiceRecorder.tsx`

**Recording state (lines 429-470):**
- Replace pulsing red dot with 5 animated waveform bars using framer-motion, amber-500 color
- Center everything vertically with text-center
- Timer: text-3xl font-mono with amber text-shadow glow
- "Listening…" in font-display text-sm uppercase tracking-widest
- Transcript box: rounded-2xl with subtle inner border, warm tint
- Stop button: rounded-full w-16 h-16 centered, bg-amber-600 with a square stop icon (custom div), not the MicOff icon. Below it a small "Tap to stop" label

**Also clean up the panel wrapper (line 427):**
- Add a subtle warm gradient overlay at the top of the panel for premium feel

No logic changes — purely visual/UI redesign of the recording state.

## Files Changed

| File | Change |
|------|--------|
| `src/components/VoiceRecorder.tsx` | Redesign recording state UI (lines 429-470) — centered waveform bars, warm palette, premium stop button |

