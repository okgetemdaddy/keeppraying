

## Fix Premium Sync + Switch Prayer TTS to xAI

### Problem Summary

1. **Premium Sync not working** — The `sermon-sync` edge function shows zero logs, indicating it may not be deployed. Additionally, the model name `grok-4.20-0309-reasoning` may not be the correct identifier for the xAI direct API — their docs list `grok-4.20-reasoning` as the correct model name.

2. **Prayer TTS uses ElevenLabs** — Should use the `XAi_Speaker` secret with xAI's new TTS API instead.

---

### Step 1 — Fix Grok model name in all edge functions

Update `"grok-4.20-0309-reasoning"` → `"grok-4.20-reasoning"` in these 5 files:
- `supabase/functions/sermon-sync/index.ts` (line 72)
- `supabase/functions/craft-prayer/index.ts` (line 81)
- `supabase/functions/verse-summary/index.ts` (line 68)
- `supabase/functions/refresh-verse-summaries/index.ts` (lines 72, 108)
- `supabase/functions/sermon-generate-prayer/index.ts` (line 51)

### Step 2 — Rewrite `prayer-tts` to use xAI TTS

Replace ElevenLabs with xAI TTS in `supabase/functions/prayer-tts/index.ts`:
- Use `XAi_Speaker` secret instead of `ELEVENLABS_API_KEY`
- Call `POST https://api.x.ai/v1/tts`
- Use voice `"sal"` (authoritative tone, fitting for prayer reading)
- Request body: `{ text, voice_id: "sal", language: "en" }`
- Response is raw audio bytes (MP3 by default) — same contract as current function
- Max 15,000 characters (up from current 5,000 ElevenLabs limit)
- No frontend changes needed — `Prayer.tsx` and `Prayers.tsx` already handle the audio response

### Step 3 — Deploy all updated edge functions

Deploy `sermon-sync`, `craft-prayer`, `verse-summary`, `refresh-verse-summaries`, `sermon-generate-prayer`, and `prayer-tts`. Test `sermon-sync` with a premium request to confirm the Grok call succeeds.

### Technical Notes
- xAI TTS supports expressive speech tags (pauses, emphasis) which could enhance prayer delivery
- The 5 available voices are: Ara, Eve, Leo, Rex, Sal — "Sal" or "Leo" are best for the reverent, authoritative tone needed for prayers
- No database or frontend changes required

