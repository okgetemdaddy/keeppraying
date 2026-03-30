

## Diagnose and Fix Premium Sync + Prayer TTS

### Investigation Results

Both edge functions are **deployed and booting** successfully:
- `prayer-tts`: Returns 200 with audio data when tested directly — the xAI TTS integration is working
- `sermon-sync`: Returns 401 (expected, requires auth) — the function is live

The code is correct: model name is `grok-4.20-reasoning`, prayer-tts uses `XAi_Speaker`, CORS headers are present.

### Likely Root Causes

1. **sermon-sync shows zero request logs** — This suggests either (a) the `youtube-transcript` step is failing *before* sermon-sync is called, or (b) there's an edge function version mismatch (stale deployment). The frontend catches errors at line 132 before ever calling sermon-sync if transcript fetch fails.

2. **prayer-tts works from server but may fail from browser** — Could be a cached `audio_url` pointing to an old/broken file, or the anon key auth header format issue on the frontend.

### Plan

**Step 1 — Force redeploy both functions**
Redeploy `sermon-sync` and `prayer-tts` to ensure the latest code is live.

**Step 2 — Add diagnostic logging to sermon-sync**
Add `console.log` statements at key points (function entry, before/after Grok API call, response status) so we can trace failures in edge function logs.

**Step 3 — Add diagnostic logging to prayer-tts**
Log the xAI TTS response status and any error details before returning, so failures are visible in logs.

**Step 4 — Check youtube-transcript function**
Since sermon-sync has zero request logs, the failure may be happening at the transcript fetch step. Review and redeploy `youtube-transcript` as well.

**Step 5 — Test end-to-end**
After redeployment, test both features to verify they work.

### Technical Details

The frontend call chain for sermon sync is:
1. `youtube-transcript` → fetches captions
2. `sermon-sync` → analyzes with Grok (premium) or Gemini (standard)

If step 1 fails, step 2 never fires — which explains the zero logs for sermon-sync.

For prayer-tts, the frontend in `Prayer.tsx` and `Prayers.tsx` calls the function with the anon key as Bearer token, which should work fine since `verify_jwt = false` by default.

