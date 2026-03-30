

## AI Audio Transcription Fallback + Church Announcements + "My Church" Board Section

This is a large feature spanning edge functions, database tables, a new board section, and UI updates. Here's the full plan:

### 1. Revert & Simplify `youtube-transcript` Edge Function

Keep the existing multi-strategy caption extraction as the **primary path** (it works for videos with real captions). Add a new **AI audio transcription fallback** when all caption strategies fail.

**AI Fallback Flow:**
- Use innertube `/youtubei/v1/player` to get `streamingData.adaptiveFormats`
- Pick lowest-bitrate audio stream (~50kbps opus/mp4a)
- Download audio in chunks (~10 min each) to handle full-length sermons
- Send each chunk to **Grok** (`grok-4.20-reasoning` via `api.x.ai`) with a timestamp-aware prompt
- Merge all chunk results with offset-corrected timestamps
- Return the same `Segment[]` format with `source: "ai-transcription"`

**Grok Transcription Prompt — Key Instructions:**
- Disregard all music, worship songs, instrumental sections
- Skip pre-sermon filler (welcome greetings, "we're getting started", tech checks)
- **Separate church announcements** from the sermon body — return them as a distinct `announcements` array
- Transcribe the sermon content with timestamps (~15-30s segments)
- Each segment gets a `start` (seconds from video start) and `dur` field for Jump-to support

**Response shape update** (backward compatible):
```json
{
  "videoId": "...",
  "videoTitle": "...",
  "raw": [{ "start": 0, "dur": 15, "text": "..." }],
  "fullText": "...",
  "source": "captions" | "ai-transcription",
  "announcements": [{ "start": 120, "text": "..." }]  // NEW — only from AI path
}
```

### 2. Add Loading Progress UI in `SermonSync.tsx`

Replace the simple spinner with a **multi-step progress indicator** when AI transcription is active:

Steps shown to user:
1. "Checking for captions..." 
2. "Downloading sermon audio..." 
3. "Transcribing with AI (chunk 1 of N)..."
4. "Analyzing sermon content..."

Implementation: The edge function returns progress via the existing response (not streaming). On the client side, use a timed animation that cycles through the steps over ~40s to give the user a sense of progress. The progress bar uses the existing `Progress` component.

### 3. New Database Table: `user_churches`

```sql
CREATE TABLE public.user_churches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  website_url text,
  address text,
  phone text,
  email text,
  scraped_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE public.user_churches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own church" ON public.user_churches FOR ALL
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

### 4. New Database Table: `church_announcements`

```sql
CREATE TABLE public.church_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  church_id uuid NOT NULL REFERENCES public.user_churches(id) ON DELETE CASCADE,
  video_id text NOT NULL,
  video_title text,
  announcement_text text NOT NULL,
  timestamp_seconds integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.church_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own announcements" ON public.church_announcements FOR ALL
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

### 5. New Edge Function: `scrape-church-info`

When a user sets up their church (enters church name + website URL):
- Fetch the church website HTML
- Send it to Grok with a prompt: "Extract church name, address, phone, email, service times, and any upcoming events from this website"
- Store the structured result in `user_churches.scraped_data`
- Return the extracted info to the client

### 6. Update `SermonSync.tsx` — Auto-Save Announcements

When the transcript response includes `announcements`:
- Show a dismissible card: "We found church announcements in this sermon"
- List each announcement with its timestamp (clickable Jump-to)
- "Save to My Church" button — prompts user to create/select their church if not set up yet, then saves announcements to `church_announcements`

### 7. New Board Section: "My Church" on `Board.tsx`

Add a collapsible section on the Prayer Board (between existing sections):
- **Header**: Church name (e.g., "Grace Community Church") with a Church icon
- **Info cards**: Address, phone, email, service times (from scraped data)
- **Announcements feed**: Recent announcements from synced sermons, each with:
  - The announcement text
  - Source video title + Jump-to timestamp link
  - Date added
- **Setup flow**: If no church configured, show a "Set up My Church" card with name + website URL inputs

### 8. Files Changed Summary

| File | Change |
|------|--------|
| `supabase/functions/youtube-transcript/index.ts` | Add AI audio fallback with Grok, announcements extraction |
| `supabase/functions/scrape-church-info/index.ts` | **New** — scrape church website for contact/event info |
| `src/pages/SermonSync.tsx` | Add progress loader, announcements card, church save flow |
| `src/pages/Board.tsx` | Add "My Church" section |
| `src/components/board/MyChurchSection.tsx` | **New** — church info + announcements display |
| `src/hooks/useUserChurch.ts` | **New** — hook for church CRUD + announcements |
| Migration | Create `user_churches` and `church_announcements` tables with RLS |

### Technical Notes

- **GROK_API_KEY** is already configured as a secret
- Audio download from YouTube: use innertube to get streaming URLs, download via byte-range requests for chunking
- Grok audio input: send as base64 `input_audio` content part
- Edge function timeout: ~60s max — for very long sermons (60+ min), process up to 6 sequential chunks
- Cached AI transcriptions go into `sermon_transcripts` same as captions — repeat requests are instant
- Church website scraping is a one-time setup action, not per-sermon

