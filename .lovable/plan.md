

## Fix Sermon Sync Audio Extraction

### Findings
- **Option 4 (AssemblyAI direct YouTube) won't work.** AssemblyAI docs explicitly state: "YouTube URLs are not supported in the `audio_url` parameter since it requires a direct link to a downloadable audio file."
- **Root cause**: The two cobalt instances currently used (`api.cobalt.tools` and `cobalt-api.kwiatekmiki.com`) are returning 400 and 530 errors respectively.

### Plan: Add more reliable cobalt instances (Option 1b)

There is an active directory of cobalt instances at `cobalt.directory` and `instances.cobalt.best` with many community instances that support YouTube. The fix is straightforward:

**Single file change: `supabase/functions/sermon-sync/index.ts`**

1. **Replace the 2 broken cobalt instances with 5-6 known-good community instances** from the cobalt directory (e.g. `nuko-c.meowing.de`, `cobalt-backend.canine.tools`, etc.) plus the official instances (`kityune.imput.net`, `blossom.imput.net`, `sunny.imput.net`)

2. **Update the cobalt API request format** to match the v11 API format used by current instances — the request body key may be `url` + `downloadMode: "audio"` (verify and align)

3. **Add a small timeout per instance** (8 seconds) so a hanging instance doesn't block the whole chain — fail fast and try the next one

4. **Keep the existing fallback** to legacy URL-based analysis if all cobalt instances fail

### Why this will work
- The cobalt directory shows dozens of active instances with YouTube support scores of 75-96%
- Multiple instances means if one goes down, others pick up
- This is the exact same approach, just with more redundancy

### No other files change
- Frontend and AssemblyAI transcription logic remain untouched
- Only the `getAudioUrl()` function in the edge function is updated

