

## Add YouTube Scrubber Auto-Fill for Sermon Time Range

### What we're building
Replace the static YouTube iframe embed with the YouTube IFrame Player API so users can scrub the video and tap "Set Start" / "Set End" buttons to auto-fill the sermon time range fields.

### Changes — single file: `src/pages/SermonSync.tsx`

**1. Load the YouTube IFrame Player API**
- On mount, inject the `https://www.youtube.com/iframe_api` script if not already present
- Set up the global `onYouTubeIframeAPIReady` callback

**2. Replace the `<iframe>` with an API-controlled player**
- Render a `<div id="yt-sermon-player">` in place of the current `<iframe>`
- When `previewVideoId` changes, create a `new YT.Player(...)` instance stored in a ref
- Pass `start` / `end` playerVars based on current `sermonStart` / `sermonEnd`

**3. Add "Set Start" / "Set End" buttons**
- Next to each timestamp input, add a button that calls `playerRef.current.getCurrentTime()`
- Format the returned seconds into `HH:MM:SS` and fill the corresponding field
- Buttons are disabled when the player isn't ready

**4. Helper: seconds → `HH:MM:SS` formatting**
- Add a `secondsToTime(s: number): string` function (inverse of the existing `timeToSeconds`)

**5. TypeScript**
- Add a minimal `declare global { interface Window { YT: any; onYouTubeIframeAPIReady: () => void } }` to avoid type errors

### UX flow
1. User pastes YouTube URL → video preview loads via Player API
2. User scrubs video to where sermon starts → taps **"Set Start"** → field auto-fills with `00:15:32`
3. User scrubs to sermon end → taps **"Set End"** → field auto-fills with `01:10:45`
4. User hits Sync — time range is sent to the edge function as before

### No other files change
- Edge function already accepts `sermonStart` / `sermonEnd` — no backend changes needed

