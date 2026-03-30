

## Add Playback Speed Slider + Captions to TTS Overlay

### What We're Building

Enhance the `TtsContemplationOverlay` to include:
1. **Playback speed slider** — 0.5x to 2x, positioned below the central pause button
2. **Live captions** — the prayer/testimony text displayed word-by-word as it's read, using a modern legible font (Inter or system sans-serif at readable size)

### Changes

**1. Update `TtsContemplationOverlay` props and UI**
File: `src/components/TtsContemplationOverlay.tsx`

- Add new props: `audioRef`, `text` (the prayer/testimony body), `playbackRate`, `onPlaybackRateChange`
- **Speed slider**: Render a horizontal slider (0.5–2.0, step 0.25) below the pause button, styled in gold tones to match the overlay. Show the current rate label (e.g. "1.0×"). When changed, set `audioRef.current.playbackRate`.
- **Captions area**: Display the full prayer text in a scrollable region near the bottom third of the screen. Use `font-family: 'Inter', system-ui, sans-serif` at ~18px, `hsla(42,40%,90%,0.85)` color, centered, max-width ~600px, with generous line-height (1.7). Subtle fade-in animation. No word-by-word sync needed (that requires timestamps the TTS API doesn't provide) — just show the full text as a readable caption block while listening.
- Prevent background click-to-stop from triggering when interacting with the slider or caption area (`e.stopPropagation()`)

**2. Pass props from Prayer.tsx and Prayers.tsx**
Files: `src/pages/Prayer.tsx`, `src/pages/Prayers.tsx`

- Pass `audioRef`, `text={card.prayer_text}`, `playbackRate` state, and `onPlaybackRateChange` handler to the overlay
- Initialize `playbackRate` state at `1.0`
- On rate change, update both state and `audioRef.current.playbackRate`

### Technical Notes
- Using the existing `Slider` component from `src/components/ui/slider.tsx` (Radix), styled with custom gold track/thumb colors via inline styles
- Caption text uses Inter (already loaded as `--font-body`) — clean, modern, highly legible
- No database changes needed

