

## Fix: YouTube Auto-Generated Captions Not Extracted Reliably

### Root Cause
YouTube's server-side bot detection intermittently serves a stripped-down HTML page (~1.1MB vs ~1.5MB) that lacks `captionTracks`. The innertube fallback also fails because the `WEB` client config gets restricted for auto-generated captions.

### Changes

**1. Update `supabase/functions/youtube-transcript/index.ts`**

- **Add retry with varied headers for HTML fetch**: If first HTML fetch lacks `captionTracks`, retry once with different User-Agent and added cookies/headers (e.g., `CONSENT=YES+` cookie to bypass consent walls)
- **Fix innertube Strategy 3**: Use multiple client configs in order:
  1. `ANDROID` client (clientName: `"ANDROID"`, clientVersion: `"19.29.37"`) — most permissive for auto-generated captions
  2. `TV_EMBEDDED` client — also less restricted
  3. Current `WEB` client as final fallback
- **Add Strategy 4**: Direct timedtext API call: `https://www.youtube.com/api/timedtext?v={videoId}&lang=en&kind=asr` (the `kind=asr` flag specifically requests auto-generated captions)
- **Add `CONSENT=YES+` cookie** to all YouTube page fetches to bypass EU/regional consent walls that strip page data
- **Add a simple retry**: If all strategies fail on first attempt, wait 1s and retry the HTML fetch once before giving up

### Strategy Order (updated)
1. Regex `captionTracks` from HTML (existing)
2. Parse `ytInitialPlayerResponse` from HTML (existing)
3. Innertube API with `ANDROID` client (new — most reliable for ASR captions)
4. Innertube API with `TV_EMBEDDED` client (new)
5. Direct timedtext API with `kind=asr` (new — targets auto-generated specifically)
6. Full retry of HTML fetch with different headers if all above fail (new)

### No other files change. No migration needed.

