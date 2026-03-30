

## Sermon Sync: Real Transcription Pipeline

### The New Architecture

```text
Current:  YouTube URL → AI "watches" video → hopes for the best
New:      YouTube URL → Extract audio URL → AssemblyAI transcribes → Grok analyzes transcript
```

The current approach asks AI models to "watch" a YouTube video, which is unreliable. The new pipeline gives Grok an actual word-for-word transcript with timestamps, producing dramatically better results.

### Critical Constraint: Edge Functions

Edge functions cannot run FFmpeg or yt-dlp — they're serverless with no binary execution. Instead, we use **cobalt.tools API** (free, no auth) to get a direct audio URL from YouTube, then pass that URL straight to AssemblyAI. No file downloading needed.

AssemblyAI transcription is **async** (submit → poll) and takes 1-5 minutes for a sermon. This means the flow must become async on the frontend too.

### Pipeline (3 Phases)

```text
Phase 1: Audio extraction (cobalt API → audio URL, ~2 seconds)
Phase 2: Transcription (AssemblyAI submit + poll, 1-5 minutes)
Phase 3: Grok analysis of transcript (same as today but with real text)
```

### Changes

**1. Edge function: `supabase/functions/sermon-sync/index.ts`**

Rewrite the core pipeline:

- **Phase 1 — Audio URL**: Call cobalt.tools API (`https://api.cobalt.tools/`) with the YouTube URL. Returns a direct download URL for the audio stream. No API key needed. If cobalt fails, fall back to a secondary service or return a clear error.

- **Phase 2 — AssemblyAI Transcription**: Submit the audio URL to AssemblyAI's `/v2/transcript` endpoint (using `Assembly_Ai` secret). Enable `auto_chapters`, `speaker_labels`, and `audio_intelligence`. Poll `/v2/transcript/{id}` until status is `completed`. Store `full_text` and `raw_segments` (utterances/chapters) in