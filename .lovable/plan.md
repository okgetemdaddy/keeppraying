

## Simplify Sermon Sync: Send YouTube URL Directly to AI

### The Insight
Instead of a complex 3-tier transcript extraction pipeline (captions → innertube → Zyla → Grok audio transcription), we send the YouTube URL straight to the AI model with a master prompt. The AI analyzes the video content and returns the structured sermon breakdown directly.

### Changes

**1. Delete `supabase/functions/youtube-transcript/index.ts`**
- Remove the entire edge function — all caption extraction, innertube audio, Zyla fallback, Grok audio transcription code

**2. Rewrite `supabase/functions/sermon-sync/index.ts`**
- Accept `{ youtubeUrl, mode }` instead of `{ transcript, rawSegments, videoTitle, videoId, mode }`
- Extract videoId from the URL server-side
- **Standard mode (Gemini)**: Send YouTube URL + master prompt to Lovable AI gateway requesting sermon notes, 4 prayer prompts with timestamp estimates, labels, and verses
- **Premium mode (Grok)**: Send YouTube URL + master prompt to Grok API requesting full breakdown: subtopics with explanations, illustrations, application points, timestamp estimates, 6 daily prayers
- Both modes ask the AI to estimate timestamps based on sermon flow (e.g. "this topic likely appears around the 15-minute mark") for Jump To links
- Cache results in `sermon_transcripts` table as before
- Return the same JSON shapes the UI already expects

**3. Update `src/pages/SermonSync.tsx`**
- Remove the two-step flow (youtube-transcript → sermon-sync)
- Single call: `supabase.functions.invoke("sermon-sync", { body: { youtubeUrl: url, mode } })`
- Remove `transcriptSource` state, announcements from AI transcription, and transcript-related progress steps
- Simplify progress steps to: "Sending to AI…" → "Analyzing sermon…" → "Preparing results…"
- Keep all result rendering (StandardResultView, PremiumResultView) exactly as-is

**4. Clean up unused code**
- Remove `useUserChurch` announcements integration from SermonSync (announcements came from transcript extraction)
- Remove Zyla-related imports/state
- Remove progress steps referencing "captions" and "audio downloading"

### What stays the same
- All UI components (StandardResultView, PremiumResultView) — no changes
- The JSON response shapes (SermonResult types)
- Jump To links (AI provides estimated timestamps, opens YouTube at `?t=Xs`)
- Week of Prayer plan creation
- Prayer saving to board
- sermon-generate-prayer edge function

### Technical Note
- Gemini models can process YouTube video URLs when included in prompts
- Grok can analyze content from URLs via its web-aware capabilities  
- If the AI can't access the video directly, it will use the video title and any available metadata — still far simpler than our current broken pipeline
- Timestamps will be AI-estimated rather than caption-precise, but this is acceptable since the current pipeline wasn't working anyway

