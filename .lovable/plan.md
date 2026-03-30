

## Replace Cobalt with YouTube Captions-First Transcript Extraction

### Problem
All public cobalt instances are failing (403 bot protection, 400 JWT errors). The entire sermon-sync pipeline breaks before AssemblyAI is ever reached.

### Solution
Replace `getAudioUrl()` + `transcribeWithAssemblyAI()` with a new `getYouTubeTranscript()` function that extracts text directly from YouTube — no third-party audio hosts needed.

### Single file change: `supabase/functions/sermon-sync/index.ts`

**1. Remove `getAudioUrl()` (lines 79-145) and `transcribeWithAssemblyAI()` (lines 148-220)**

These depend entirely on cobalt, which is dead for server-side use.

**2. Add `getYouTubeTranscript(videoId)` with 3-tier fallback:**

- **Tier 1 — Direct captions API**: Fetch `youtube.com/api/timedtext?v={id}&lang=en&fmt=json3`. Most church sermons have auto-generated or manual captions. Returns timed segments.
- **Tier 2 — Innertube player API**: POST to `youtube.com/youtubei/v1/player` with WEB client context to get `captionTracks` from the player response, then fetch the track's `baseUrl` with `&fmt=json3`. Covers cases where Tier 1 misses language variants.
- **Tier 3 — Zyla API** (existing `ZYLA_API_KEY` secret): Last resort paid fallback for videos with no captions at all.

**3. Update the main handler (lines 484-512)**

Replace the `getAudioUrl → transcribeWithAssemblyAI` call chain with `getYouTubeTranscript(videoId)`. The return shape stays compatible: `{ text, timed }` where `timed` provides word/segment-level timestamps for time-range filtering. The `rawSegments` structure adapts slightly (segments instead of AssemblyAI words/chapters/utterances) but `extractTimeRange` will be updated to work with the new timed format.

**4. Keep everything else untouched**

- All prompts (standard, premium, legacy fallbacks) remain identical
- Caching logic stays the same
- Grok → Gemini premium pipeline unchanged
- Legacy "watch the video" URL-based fallback still exists as ultimate safety net (lines 340-386)

### Why this will work
- YouTube captions are served directly by Google — no third-party dependency
- Most church sermon livestreams/uploads have auto-generated English captions
- Innertube is YouTube's own internal API, used by every YouTube client
- The existing ZYLA_API_KEY provides a paid safety net
- No new secrets or dependencies needed

### Technical details
- The `extractTimeRange` function (line 223) will be updated to work with timed segments (offset-based) instead of AssemblyAI word timestamps, using the same start/end millisecond logic
- Caption segments provide paragraph-level timing rather than word-level, which is sufficient for time-range filtering
- The `chaptersInfo` formatting stays the same but will use segment boundaries if no explicit chapters exist

