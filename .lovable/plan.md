

## Remove Transcript Fetching, Direct Video Analysis, Relaxed Timestamps

### What changes

**Single file:** `supabase/functions/sermon-sync/index.ts`

**1. Delete all transcript-fetching code**
Remove these functions and types entirely:
- `CaptionTrack`, `TranscriptSegment` types
- `normalizeWhitespace`, `decodeXmlText`, `chooseBestTrack`, `fetchCaptionTracks`, `fetchTranscriptFromYoutube`

**2. Remove transcript-fetching block from main flow (~lines 339-367)**
Delete the block that calls `fetchTranscriptFromYoutube` and stores `full_text`/`raw_segments`. The function will no longer read or write transcript columns.

**3. Update prompts — URL-only, timestamps optional**

`STANDARD_PROMPT(youtubeUrl)`:
- Remove transcript block; just pass the YouTube URL
- Tell the AI to analyze the video directly
- Remove `timestamp_seconds` from the prayer prompt requirements

`PREMIUM_GROK_PROMPT(youtubeUrl)`:
```
You are an expert at creating detailed church service and sermon outlines.

Watch and analyze this entire YouTube video from start to finish:
{youtubeUrl}

Create a professional, detailed breakdown of the service/sermon.

Include:
1. Service Outline — major sections of the service in order
2. Sermon Title & Main Scripture
3. Overall Message — 2-3 sentence summary
4. Subtopics (4-7) with title, explanation, illustrations/stories mentioned, application points, and supporting verses
5. Daily Prayer Prompts (Monday-Saturday) with a short prompt and verse

If you can identify approximate timestamps, include them, but do not force or fabricate them. Focus on content accuracy over timing precision.

Use warm, encouraging, practical language. All content must come from the video — do not invent or embellish.
```

Key change: timestamps are welcome but **optional** — Grok won't refuse or get stuck trying to produce exact HH:MM:SS values.

`GEMINI_EXTRACTION_PROMPT(rawAnalysis)`:
- Make `start`/`end` in `serviceOutline` nullable
- Make `timestamp_seconds` in `subtopics` nullable (already is, but reinforce in prompt text: "use null if not available")

**4. Simplify the main flow**
- Premium: check `premium_result` cache → check `raw_ai_response` (run Phase 2 only) → call Grok with URL → save raw → call Gemini to extract JSON → save/return
- Standard: check `analysis_result` cache → call Gemini with URL → save/return
- Still create/update `sermon_transcripts` row by `video_id` for caching, but skip transcript columns

### Technical details
- Grok-4.20-reasoning supports multimodal YouTube URL analysis
- Gemini models also support URL-based video content analysis
- Two-phase architecture preserved for premium mode
- No frontend changes needed — same JSON shape returned, timestamps just may be null

