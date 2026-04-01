

# Add AI Voice Preference to Site Settings

## What we're building
A new "AI Voice" section in the Site Settings sheet on /board where users pick which xAI voice reads their prayers aloud. Currently hardcoded to "sal" — this makes it a persisted user preference.

## Available xAI TTS Voices
| Voice ID | Type | Tone |
|----------|------|------|
| `eve` | Female | Energetic, upbeat (default) |
| `ara` | Female | Warm, friendly |
| `rex` | Male | Confident, clear |
| `sal` | Neutral | Smooth, balanced (current hardcoded) |
| `leo` | Male | Authoritative, strong |

## Changes

### 1. Database Migration
Add `tts_voice_id` column to `board_preferences`:
```sql
ALTER TABLE board_preferences ADD COLUMN tts_voice_id text NOT NULL DEFAULT 'sal';
```

### 2. `src/hooks/useBoardPreferences.ts`
- Add `tts_voice_id: string` to `BoardPrefs` interface (default: `"sal"`)
- Include it in the select query and fresh-data mapping

### 3. `src/components/board/SiteSettingsSheet.tsx`
- Add a new "AI Voice" section (with a `Volume2` or `AudioLines` icon) between Caption Mode and Voice Card Display
- Use a `RadioGroup` with all 5 voices, each showing name + short description (e.g. "Sal — Smooth, balanced" / "Eve — Energetic, upbeat")
- Calls `onSave({ tts_voice_id: value })` on selection

### 4. `src/hooks/useTtsPlayer.ts`
- Accept `voiceId?: string` in `UseTtsPlayerOptions`
- Pass it in the edge function request body: `body: JSON.stringify({ text, voiceId })`

### 5. `supabase/functions/prayer-tts/index.ts`
- Read `voiceId` from request body (default to `"sal"` if not provided)
- Use it in the xAI TTS call instead of hardcoded `"sal"`

### 6. `src/components/board/BoardCard.tsx` (or wherever `useTtsPlayer` is called)
- Pass `voiceId: prefs.tts_voice_id` (from board preferences) into the TTS player so the user's chosen voice is used

