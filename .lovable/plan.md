

## Use Zyla Labs API for Audio Download + Fix AI Transcription

### Problem
The current AI transcription fallback fails because innertube's `getAudioStreamUrl()` returns no audio stream for many videos. The function never reaches Grok.

### Solution
Add Zyla Labs "YouTube Download and Info API" as the audio source when innertube fails. This gives us a reliable download URL for the audio, which we then send to Grok for transcription.

### Fallback Chain

```text
YouTube URL
  │
  ├─ Step 1: Caption extraction (existing, keep)
  │   └─ Found? → Parse XML → done
  │
  ├─ Step 2: Innertube audio stream (existing, keep as first try)
  │   └─ Audio stream URL? → Download → Grok → done
  │
  └─ Step 3: Zyla Labs API (NEW fallback)
      └─ Call download endpoint → get audio URL → Download → Grok → done
```

### Changes

**1. Add `ZYLA_API_KEY` secret**
- Prompt user to add their Zyla Labs API key

**2. Update `supabase/functions/youtube-transcript/index.ts`**

Add a new function `fetchAudioViaZyla(videoId, zylaApiKey)` that:
- Calls `GET https://zylalabs.com/api/1106/youtube+download+and+info+api/download?id={videoId}` with `Authorization: Bearer {key}`
- Extracts the audio download URL from the response
- Returns the URL and estimated duration

Update the Step 3 fallback logic:
- First try innertube `getAudioStreamUrl()` (current behavior)
- If that returns null, call `fetchAudioViaZyla()` to get an audio URL
- Download the audio from whatever URL we got
- For long sermons, chunk the audio and process each chunk through Grok sequentially
- Merge all chunks with offset-corrected timestamps

**3. Fix the audio download for Zyla URLs**
- Zyla returns a direct MP3/audio URL — download it fully (no byte-range needed for the Zyla path)
- For large files, still chunk by time offset when sending to Grok
- Convert audio bytes to base64 for each chunk before sending to Grok

### Technical Details

- Zyla API auth: `Authorization: Bearer {ZYLA_API_KEY}`
- The API returns download links for the video; we pick the audio-only option
- 25,000 calls on Basic plan — more than sufficient for sermon usage
- The rest of the pipeline (Grok transcription, chunking, announcements extraction, caching) stays identical
- No client-side changes needed — same response shape

### Secret Required
- `ZYLA_API_KEY` — user already has an account and API key from Zyla Labs

