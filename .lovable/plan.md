

## Plan: Enhanced Sermon Mode — Final Version

### Summary

Two-tier Sermon Mode with new caption extractor, caption cleaning, cached transcripts, "Jump to" timestamps, and Premium Sync via Grok API. Subtopic cards conditionally hide the illustration section when the AI determines none exists.

### Changes (5 files + 1 migration)

#### 1. Database Migration: `sermon_transcripts` table

New table for caching transcripts and analysis results keyed by video ID with 30-day TTL. Columns: `video_id` (unique), `video_title`, `raw_segments` (jsonb with start/dur/text), `full_text`, `analysis_result` (jsonb), `premium_result` (jsonb), `fetched_at`, `user_id`. RLS: authenticated select all, insert own.

#### 2. New Edge Function: `supabase/functions/youtube-transcript/index.ts`

Dedicated caption extractor. Auth required. Extracts video ID, checks cache (30-day TTL), fetches YouTube HTML + caption XML if not cached. Parses timed segments with `start`/`dur`. Cleans captions (strips `[Music]`, `[Applause]`, `♪`, filler words). Returns `{ videoId, videoTitle, raw, fullText, cached }`. Rate limits 20 req/min per user. User-friendly error when captions unavailable.

#### 3. Rewrite: `supabase/functions/sermon-sync/index.ts`

Remove all old caption fetching and oEmbed code. Accept `{ transcript, rawSegments, videoTitle, videoId, mode }`.

- **Standard mode**: Lovable AI (Gemini) with current prompt structure, adds `timestamp_seconds` per note point using the timed segments.
- **Premium mode**: Grok API (`api.x.ai`, `grok-4.20-0309-reasoning`, `GROK_API_KEY`). Prompt instructs AI to return `illustration` as `null` or omit when no illustration/story was used by the pastor. Returns structured subtopics with `title`, `explanation`, `illustration` (nullable), `supporting_verses`, `timestamp_seconds`, plus `main_scripture`, `overall_message`, and 6 daily prayer prompts (Mon–Sat).

Caches results back to `sermon_transcripts`.

#### 4. New Edge Function: `supabase/functions/sermon-generate-prayer/index.ts`

Accepts `{ prompt, day, sermonTitle }` with auth. Uses Grok API to generate a full prayer. Returns `{ prayer: string }`.

#### 5. UI Update: `src/pages/SermonSync.tsx`

**Two buttons**: "Sync" (existing gold) and "Premium Sync" (gradient with sparkle icon). Both call `youtube-transcript` first, then `sermon-sync` with appropriate mode.

**Standard flow**: Same as today but each note gets a "Jump to ▶" button.

**Premium flow**:
- Sermon title + main scripture header
- Overall message paragraph
- Expandable subtopic cards:
  - Header: title + "Jump to ▶" button
  - Body: explanation paragraph
  - **Illustration section conditionally rendered only when `illustration` is non-null/non-empty** — if the pastor didn't use a story or example, the section is completely absent from the card (no empty heading, no placeholder)
  - Supporting verses as tappable `VerseLink` components
- 6 daily prayer prompt cards (Mon–Sat) with day badge, Generate Prayer button (calls `sermon-generate-prayer`), editable textarea, Regenerate button, notification time selector (Morning/Afternoon/Night in localStorage)
- Select/deselect + batch save to Board with `videoId`, `timestamp_seconds` in metadata so Jump to works from `/board`

**Jump to behavior**: Opens YouTube iframe embed with `?start=<seconds>&autoplay=1`. On `/board`, sermon cards with timestamp metadata render the Jump to button that pulls up the video at the exact second.

### Files

| File | Action |
|---|---|
| DB migration | New — `sermon_transcripts` table |
| `supabase/functions/youtube-transcript/index.ts` | New |
| `supabase/functions/sermon-sync/index.ts` | Rewrite |
| `supabase/functions/sermon-generate-prayer/index.ts` | New |
| `src/pages/SermonSync.tsx` | Update |

