

## Fix: Pause Button Should Pause, Not Stop

### Problem
The central button in the TTS contemplation overlay calls `onStop()`, which resets the audio to `currentTime = 0` and closes the overlay. The user expects tapping the pause button to **pause** playback (keeping position), with the ability to resume — and only closing the overlay via "tap anywhere" on the background.

### Solution
Add pause/resume support to the overlay by introducing an `onPause` and `onResume` callback, and track a paused state internally.

### Changes

**1. `src/components/TtsContemplationOverlay.tsx`**
- Add `onPause` and `onResume` props alongside `onStop`
- Track internal `paused` state
- Central button toggles between pause/play (show Play icon when paused, Pause icon when playing)
- Clicking the button calls `onPause`/`onResume` — does NOT close the overlay
- Background "tap anywhere" still calls `onStop` (full stop + close)
- When paused, freeze the caption auto-advance timer
- Show a subtle "paused" visual state (e.g. pulse rings slow/stop, slight dim)

**2. `src/pages/Prayer.tsx` (~lines 325-337)**
- Add `onPause` and `onResume` handlers:
  - `onPause`: `audioRef.current.pause()` (no currentTime reset)
  - `onResume`: `audioRef.current.play()`
- Keep `onStop` as-is for full stop via background tap

**3. `src/pages/Prayers.tsx` (~lines 272-285)**
- Same `onPause`/`onResume` pattern as Prayer.tsx

### Technical Details
- Import `Play` icon from lucide-react alongside `Pause`
- Caption timer effect checks both `playing` and `!paused` before advancing
- The "Tap anywhere to stop" hint remains — background tap is the exit action
- Central button becomes a pause/resume toggle, not a stop button

