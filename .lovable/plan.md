

## Synced Captions for TTS Prayer Playback

### Problem
The current overlay estimates caption timing using a fixed words-per-minute calculation, which drifts badly because spoken prayer has variable pauses, emphasis, and breathing.

### Solution
Generate a timed-phrases JSON alongside the audio via an LLM call, cache both in Supabase Storage, and drive caption highlighting from `audio.timeupdate` on the frontend.

### Architecture

```text
Speaker click
  ├─ Check cache: {id}.mp3 + {id}_phrases.json in prayer-audio bucket
  │   ├─ Both exist → load both, play
  │   └─ Missing → call prayer-tts edge function
  │         ├─ Step 1: xAI TTS → MP3 audio (existing)
  │         ├─ Step 2: Grok LLM → timed phrases JSON (new)
  │         └─ Return JSON: { audio: base64, timedPhrases: [...] }
  │
  ├─ Client caches both to prayer-audio bucket
  └─ Overlay syncs captions via audio.timeupdate
```

### Changes

**1. Edge Function: `supabase/functions/prayer-tts/index.ts`**

- Keep existing xAI TTS call for audio generation
- After getting the audio, make a second call to Grok LLM (`api.x.ai/v1/chat/completions` using `GROK_API_KEY`) with a structured prompt asking for timed phrases at ~130-150 WPM prayer pace
- Change response format: instead of streaming raw audio, return JSON with `{ audio: base64-encoded-mp3, timedPhrases: [{ text, start }] }`
- This means the client no longer streams — it receives a JSON payload with both pieces

**2. Overlay: `src/components/TtsContemplationOverlay.tsx`**

- Add new prop: `timedPhrases?: { text: string; start: number }[]`
- Add new prop: `audioRef?: React.RefObject<HTMLAudioElement>` (to read `currentTime`)
- Replace the word-count interval timer with `audio.timeupdate` listener:
  - On each `timeupdate`, find the last phrase where `start <= currentTime`
  - Set that as the active phrase index
- Keep existing line rendering, opacity logic, pause/resume, speed slider
- When `timedPhrases` is provided, use those phrases as the lines instead of `splitIntoLines(text)`
- Playback rate changes are already applied to the audio element, so `timeupdate` naturally syncs

**3. Frontend: `src/pages/Prayer.tsx` and `src/pages/Prayers.tsx`**

- Add state: `timedPhrases` (the cached phrase array)
- In `toggleTts`:
  - **Cached path**: Check for `{id}_phrases.json` in storage alongside the audio. Load both.
  - **Fresh path**: Call the updated edge function, decode base64 audio to blob, parse timedPhrases from JSON response
  - Cache both: upload `.mp3` and `_phrases.json` to `prayer-audio` bucket
- Pass `timedPhrases` and `audioRef` to `TtsContemplationOverlay`
- When audio_url already exists but phrases JSON doesn't (legacy cached audio), fall back to the old word-estimation method

**4. Grok LLM Prompt (inside edge function)**

```
You are an expert at estimating natural prayer pacing.
Given this prayer text, return ONLY valid JSON.

Text: """[prayer text]"""

Return: { "phrases": [{ "text": "phrase", "start": 0.0 }, ...] }
- Estimate at a peaceful prayer pace (~130-150 WPM)
- Add natural pauses after periods, commas, and between thoughts
- Keep phrases 5-15 words each
```

Use tool calling / structured output to ensure valid JSON.

### Technical Details

- The edge function switches from streaming audio to returning a JSON body — slightly higher memory but enables the two-part response
- Base64 encoding adds ~33% overhead but keeps the response self-contained; for a typical 60s prayer MP3 (~500KB), the JSON response will be ~700KB — acceptable
- `timeupdate` fires ~4 times/second, giving smooth ~250ms sync granularity
- Legacy audio_url entries (no phrases JSON) gracefully fall back to the old timer method
- Phrase timing from LLM is approximate but much better than uniform word distribution since it accounts for sentence structure, punctuation pauses, and prayer cadence

