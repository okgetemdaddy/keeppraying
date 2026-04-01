

# Voice Waveform Player + Caption Toggle Improvements

## Problem
1. The waveform bars change shape during playback (driven by real-time frequency analyser) — they should stay static and only change **color** as audio progresses
2. Unplayed bars should be **grey**, played bars should fill with a **gradient orange** (left-to-right fill effect)
3. The play button should play the **user's recorded voice**, not AI TTS — need to verify it's using `voice_audio_url` (it is)
4. A **closed caption (CC) toggle icon** needs to appear next to:
   - The Volume2 (speaker/listen) button on every card footer
   - The play button on voice prayer cards (VoiceWaveformPlayer)

## Changes

### File 1: `src/components/board/VoiceWaveformPlayer.tsx`

**Waveform behavior fix:**
- Keep the static bars generated on mount as the **permanent shape** — never replace them with analyser data
- Remove the `connectAnalyser` / `animateBars` logic entirely (no more real-time frequency reshaping)
- Color logic: unplayed bars = `#9ca3af` (grey-400), played bars = gradient orange (`hsl(30, 90%, 50%)` → `hsl(42, 85%, 55%)`)
- Use progress-based coloring: bar index `i / barCount <= progress` determines played vs unplayed

**Add caption toggle button:**
- New prop: `captionsEnabled?: boolean`, `onToggleCaptions?: () => void`
- Render a `Captions` (or `Subtitles`) icon button next to the play/pause button
- When active, icon is highlighted in accent color; when off, greyed out

### File 2: `src/components/board/BoardCard.tsx`

**Add CC toggle next to Volume2 (listen) button in ActionButtons:**
- Add a `Captions` icon button right next to the existing Volume2 button
- Wire it to toggle `captionModeTts` per-card (local state toggle that controls whether clicking listen opens the TtsContemplationOverlay or plays inline)
- When caption mode is on, the CC icon is highlighted; when off, greyed

**Wire caption toggle to VoiceWaveformPlayer:**
- Pass `captionsEnabled={captionModeRecorded}` and `onToggleCaptions` to the `VoiceWaveformPlayer` instance
- The toggle flips whether the play button opens caption overlay vs plays inline audio

## Visual Summary
```text
Before:  [▶] [|||dynamic bars|||]  0:00 — 1:23
After:   [▶] [CC] [███grey░░░░░░]  0:00 — 1:23
                   ^^orange fill^^
```

Card footer:
```text
Before:  ❤️  📌  🔊  ↗  ⋯
After:   ❤️  📌  🔊 [CC]  ↗  ⋯
```

