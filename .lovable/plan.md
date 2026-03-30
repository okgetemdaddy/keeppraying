

## Add Sermon Start/End Time Selector

### Concept
After pasting a YouTube URL, the user sees the video preview with two time-picker inputs: "Sermon starts at" and "Sermon ends at" (HH:MM:SS format). They set the range, then press Sync. The AI prompt includes instructions to only analyze that specific portion of the video.

### Changes

**1. `src/pages/SermonSync.tsx` — Add time range UI + pass times to edge function**

- Add two new state variables: `sermonStart` (string, default `""`) and `sermonEnd` (string, default `""`)
- Below the video preview iframe, render a "Sermon Time Range" section with:
  - Two time inputs (HH:MM:SS) using standard `<Input>` with `type="text"` and placeholder `"00:00:00"`
  - Labels: "Sermon starts at" and "Sermon ends at"
  - Helper text: "Set the start and end time so AI focuses only on the sermon portion"
- Update the YouTube embed `src` to include `?start=X&end=Y` parameters when set (converts HH:MM:SS to seconds) so the preview reflects the selected range
- Pass `sermonStart` and `sermonEnd` in the `handleSync` body:
  ```ts
  body: { youtubeUrl: url, mode, sermonStart, sermonEnd }
  ```
- Reset `sermonStart`/`sermonEnd` when URL changes

**2. `supabase/functions/sermon-sync/index.ts` — Use time range in AI prompts**

- Parse `sermonStart` and `sermonEnd` from request body
- Add a helper `formatTimeRange(start, end)` that returns a prompt instruction like:
  `"IMPORTANT: Only analyze the portion of the video from 00:15:30 to 01:02:00. Ignore everything outside this range (worship, announcements, etc.)."`
  Returns empty string if neither is set.
- Append this instruction to both `STANDARD_PROMPT` and `PREMIUM_GROK_PROMPT` when provided
- Update cache key logic: include time range in cache lookup so different ranges for the same video get separate cached results. Use a composite approach: append `_start_end` to video_id when querying/storing, or add the range to the cache check query.

**3. Cache consideration**
- When start/end times are provided, skip the cache (or use a range-specific cache key) since different time ranges produce different results. Simplest approach: skip cache when times are provided — users typically sync a sermon once.

### Technical details
- Time input validation: accept `MM:SS` or `HH:MM:SS`, convert to seconds with a helper
- YouTube embed already supports `?start=X&end=Y` in seconds
- No database changes needed — just passing extra params to the edge function
- Prompts will explicitly tell the AI to focus only on the specified time range

