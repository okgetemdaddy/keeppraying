
## Root Cause

The dual-video crossfade technique is correctly implemented in code, but the problem is the **video content itself** — the sun moves from a low/dark position to a bright peak during the clip. When the video resets to frame 0 (dark/low sun), there is a jarring brightness flash because:

1. The incoming video (starting at frame 0) has a distinctly different brightness/sun position than the outgoing video's final frame
2. The 1.2-second crossfade cannot hide this because the luminance difference is too large

## The Fix — Two-Part Approach

### Part 1: Regenerate the video with a loopable prompt

The current video captures a sun arc (dark → bright → dark). Replace it with a scene that has **no directional light movement** — only ambient, diffused golden-hour light with gentle atmospheric elements (drifting mist, softly swaying leaves, slow cloud drift). This removes the brightness discontinuity entirely.

New prompt strategy (per the stack overflow hint):
> "Peaceful meadow bathed in unchanging soft diffused golden-hour light, gentle swaying grass and tree leaves, slow drifting atmospheric haze, warm amber tones, no sun visible, cinematic"

### Part 2: Increase crossfade window + add luminance-mask overlay trick

Even with a better video, increase the `CROSSFADE_BEFORE` constant from `1.2s` to `2.5s` so the blend starts earlier and is less abrupt. Also add a very brief dark-to-transparent overlay that fires only during the crossfade window to "cushion" any remaining luminance jump.

```text
Current:  CROSSFADE_BEFORE = 1.2s  →  New: 2.5s
Crossfade duration CSS:  1200ms  →  2000ms
```

### Part 3: CSS fallback — `mix-blend-mode` softening

Add `will-change: opacity` and `backface-visibility: hidden` to both video elements to ensure GPU-composited transitions that don't drop frames on the fade.

## Files to Change

- `src/assets/hero-video.mp4` — regenerate with ambient/non-directional light prompt
- `src/pages/Index.tsx` — increase `CROSSFADE_BEFORE` to `2.5`, extend CSS transition to `2000ms`, add `will-change: opacity; backface-visibility: hidden` to both video elements
