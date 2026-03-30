

## Master Update: TtsContemplationOverlay

### Current problems
- Only 6 lines visible, fixed 30px line height, `whiteSpace: "nowrap"` truncates text
- Play button and speed slider sit in the center above captions, taking prime real estate
- No audio scrubber/seek slider
- The "glow" effect on the active line is just a slight scale bump — no actual glow

### New layout (top to bottom)

```text
┌─────────────────────────────────┐
│                                 │
│   (subtle pulse rings behind)   │
│                                 │
│   ┌───────────────────────┐     │
│   │  ...faded lines...    │     │  ← many more lines visible
│   │  dim line             │     │    (~12-14 lines on mobile)
│   │  ▓▓ GLOWING LINE ▓▓  │     │  ← center 3 lines get gold
│   │  ▓▓ GLOWING LINE ▓▓  │     │    text-shadow glow effect
│   │  ▓▓ GLOWING LINE ▓▓  │     │
│   │  dim line             │     │
│   │  ...faded lines...    │     │
│   └───────────────────────┘     │
│                                 │
│  ═══════○═══════════════════    │  ← audio scrubber (seek)
│  0:42                    2:15   │
│                                 │
│  ⏸  ───○────── 1×    0.5× 2×   │  ← play/pause + speed slider
│                                 │
│       tap anywhere to stop      │
└─────────────────────────────────┘
```

### Changes to `src/components/TtsContemplationOverlay.tsx`

**1. Captions become the hero — front and center**
- Increase visible lines from 6 to ~14 (use `calc(100vh - 220px)` so captions fill most of the screen)
- Remove `whiteSpace: "nowrap"` — allow text wrap
- Use `auto` line height (~1.5em at 16px) instead of fixed 30px
- Each "line" gets a measured height; the scroll offset uses cumulative height rather than `index * LINE_HEIGHT`

**2. Center 3 lines get a gold glow**
- The current line and its immediate neighbors (distance -1, 0, +1) get a `textShadow` glow:
  - distance 0: `0 0 20px hsla(42,60%,60%,0.6), 0 0 40px hsla(42,50%,50%,0.3)` + full opacity
  - distance ±1: `0 0 12px hsla(42,55%,55%,0.35)` + high opacity
- Lines beyond ±1 fade out progressively (existing opacity curve, adjusted for more lines)

**3. New audio scrubber slider**
- Add `audioCurrentTime` and `audioDuration` state, polled from `audioRef` every 80ms (reuse existing interval)
- Render a full-width `<Slider>` below the captions showing playback position
- `onValueChange` → `audioRef.current.currentTime = value` for seeking
- Time labels: `mm:ss` on left (current) and right (duration)
- Gold-themed styling matching the speed slider

**4. Controls move to the bottom**
- Below the scrubber: a row containing:
  - Play/Pause button (smaller, 48px circle instead of 80px)
  - Speed slider (compact, inline)
  - Speed label
- Remove the large centered play button and the concentric pulse rings from center (or push rings behind the captions as subtle ambient decoration)

**5. Pulse rings become subtle background**
- Move rings behind the caption area (lower z-index), positioned at vertical center
- Reduce opacity further