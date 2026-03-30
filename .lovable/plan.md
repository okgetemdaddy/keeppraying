

## Update Premium Grok Prompt to Match Grok's Own Recommendations

### What Grok told you
Grok recommends a specific prompt structure that produces richer, more accurate results — including a full service outline, detailed sermon timestamps with time ranges, illustrations, and practical language. It also recommends `temperature: 0.0` and `max_tokens: 12000`.

### The constraint
The frontend (`SermonSync.tsx`) renders premium results using a specific JSON structure: `sermonTitle`, `mainScripture`, `overallMessage`, `subtopics[]`, and `dailyPrayers[]`. We must keep JSON output, but we can adopt Grok's recommended prompt tone and instructions.

### Plan

**File: `supabase/functions/sermon-sync/index.ts`**

1. **Replace `PREMIUM_PROMPT`** — Adopt Grok's recommended prompt style (thorough analysis, precise timestamps, warm encouraging tone, full service breakdown) but wrap it in a JSON output requirement so the frontend still works. The new prompt will:
   - Use Grok's identity framing: "You are Grok 4.20 Reasoning, an expert at creating clean, highly usable, timestamped church service and sermon outlines from full YouTube videos"
   - Ask for the full service analysis with precise timestamps from captions/transcript
   - Request illustrations, personal stories, key applications, closing challenge
   - Keep the JSON schema the frontend expects
   - Add a `serviceOutline` field (array of service sections with timestamps) — new data the frontend can optionally render later

2. **Update Grok API call parameters** — Add `temperature: 0.0` and `max_tokens: 12000` per Grok's recommendations for maximum consistency and no cutoff.

3. **Update system prompt** — Remove the generic system message; Grok's recommended prompt already sets the role/identity inline.

### New premium prompt (approximate)

```typescript
const PREMIUM_PROMPT = (youtubeUrl: string) => `You are Grok 4.20 Reasoning, an expert at creating clean, highly usable, timestamped church service and sermon outlines from full YouTube videos.

Analyze the complete video here: ${youtubeUrl}

Create a professional, detailed breakdown. Make the timestamps as precise as possible using the video's captions/transcript. Include: illustrations used by the pastor, main teaching points, personal stories, key applications, and the closing challenge/prayer. Use warm, encouraging, practical language. Match the level of detail and formatting from previous high-quality responses you have given on church services.

All content must be derived directly from what was actually preached — do not invent or add content beyond what was taught. Only use real Scripture references.

Return valid JSON (no markdown fences) in this exact structure:
{
  "sermonTitle": "string",
  "mainScripture": "string (primary Bible passage)",
  "overallMessage": "string (2-3 sentence summary)",
  "serviceOutline": [
    { "section": "string (e.g. Worship Set, Announcements, Sermon)", "start": "HH:MM:SS", "end": "HH:MM:SS" }
  ],
  "subtopics": [
    {
      "title": "string",
      "explanation": "string (2-4 sentences)",
      "illustration": "string or null (only if pastor actually used one)",
      "application_points": ["practical takeaway"],
      "supporting_verses": ["verse reference"],
      "timestamp_seconds": number_or_null
    }
  ],
  "dailyPrayers": [
    { "day": "Monday", "prompt": "prayer direction", "verse": "verse reference" }
  ]
}

Include 4-7 subtopics and 6 daily prayers (Monday–Saturday).`;
```

### API call changes

```typescript
body: JSON.stringify({
  model: "grok-4.20-0309-reasoning",
  temperature: 0.0,
  max_tokens: 12000,
  messages: [
    { role: "user", content: PREMIUM_PROMPT(youtubeUrl) },
  ],
}),
```

- Removes the separate system message (identity is in the prompt itself per Grok's recommendation)
- Adds `temperature: 0.0` for consistency
- Adds `max_tokens: 12000` to prevent cutoff

### Frontend impact
- No breaking changes — all existing fields (`sermonTitle`, `mainScripture`, `overallMessage`, `subtopics`, `dailyPrayers`) are preserved
- New `serviceOutline` field is additive — the UI won't break, it just won't render it yet (can be added later)

### Files changed
- `supabase/functions/sermon-sync/index.ts` only

