

# Voice-Recorded Prayers + Site Settings Sheet

## Overview
Three interconnected features: (1) Enhanced voice recording that captures actual audio and produces a prayer card with a waveform player, (2) a Site Settings sheet on /board, and (3) a "voice-only" card display mode where the prayer text is hidden and the waveform fills the card.

---

## 1. Database Changes

**Migration: Add columns to `board_preferences`**
- `caption_mode_tts` (boolean, default `true`) — show caption overlay for KeepPray.ing TTS voices
- `caption_mode_recorded` (boolean, default `true`) — show caption overlay for user-recorded prayer audio
- `default_card_layout` (text, default `'standard'`) — card display mode: `'standard'` or `'voice-visual'`

**Migration: Add column to `prayer_cards`**
- `voice_audio_url` (text, nullable) — URL of the user's raw voice recording (distinct from `audio_url` which is TTS-generated)

---

## 2. Enhanced Voice Recorder (`VoiceRecorder.tsx`)

Current behavior: Uses browser SpeechRecognition for text transcription only, no audio is captured.

**Changes:**
- Record actual audio via `MediaRecorder` API alongside SpeechRecognition (parallel capture)
- After stop: upload the recorded audio blob to Supabase Storage (`prayer-audio` bucket) as `voice_{prayerId}.webm`
- Save the storage URL to `prayer_cards.voice_audio_url` after card creation
- The resulting prayer card has both the refined text AND the original voice recording
- Add `"voice-prayer"` label (already done) so cards can be identified as voice-recorded

---

## 3. Voice Waveform Player Component

**New file: `src/components/board/VoiceWaveformPlayer.tsx`**

A self-contained audio player that:
- Takes an audio URL and renders a horizontal waveform bar spanning the card width
- Play/pause button on the left
- Animated waveform visualization (canvas or CSS bars) that responds to audio playback using `AnalyserNode` from Web Audio API
- Progress indicator overlaid on the waveform (elapsed portion highlighted)
- Elapsed time / duration display
- Compact height (~48-56px) to fit naturally on a prayer card

---

## 4. BoardCard Integration

**In `BoardCard.tsx`:**
- Detect if `card.voice_audio_url` exists (voice-recorded prayer)
- If yes, render `VoiceWaveformPlayer` below the title
- When user taps play:
  - Check site settings for `caption_mode_recorded`
  - If ON: open `TtsContemplationOverlay` with the voice audio + prayer text as captions
  - If OFF: play audio inline via the waveform player only
- Similarly, for the existing TTS "Listen" button, check `caption_mode_tts` to decide whether to show the contemplation overlay

**Voice-Visual card mode** (setting #3):
- When `default_card_layout === 'voice-visual'` AND the card has `voice_audio_url`:
  - Hide `prayer_text` body
  - Show only the title and a large waveform visualization that fills the card area
  - The waveform animates/pulses with the audio, creating an immersive visual

---

## 5. Site Settings Sheet

**New file: `src/components/board/SiteSettingsSheet.tsx`**

A `Sheet` (side="right") containing:

| Setting | Control | Description |
|---------|---------|-------------|
| Caption Mode — KeepPray.ing Voices | Switch | When ON, pressing Listen opens the full-screen caption overlay. When OFF, audio plays inline. |
| Caption Mode — Recorded Prayers | Switch | Same toggle for user-recorded voice prayers. |
| Voice Card Display | Radio/Toggle | "Standard" (text + small player) vs "Voice Visual" (title only + full-card waveform) |
| Animations | Switch | Already exists in prefs — surface it here too |
| Atmosphere | Selector | Already exists — surface it here for easy access |
| Bible Text Size | Slider | Already in `board_preferences.bible_text_size` |

All settings persist via `useBoardPreferences` → `board_preferences` table, synced across devices.

**Trigger:** Add a Settings gear icon (`Settings` from lucide) to the Board header nav bar (both mobile and desktop).

---

## 6. Hook Updates

**`useBoardPreferences.ts`:**
- Add `caption_mode_tts`, `caption_mode_recorded`, `default_card_layout` to the `BoardPrefs` interface and defaults
- Include them in the select query and upsert

---

## Files Summary

| File | Action |
|------|--------|
| DB migration | Add 3 cols to `board_preferences`, 1 col to `prayer_cards` |
| `src/hooks/useBoardPreferences.ts` | Add new pref fields |
| `src/components/VoiceRecorder.tsx` | Add MediaRecorder audio capture + upload |
| `src/components/board/VoiceWaveformPlayer.tsx` | New — waveform audio player |
| `src/components/board/SiteSettingsSheet.tsx` | New — settings sheet |
| `src/components/board/BoardCard.tsx` | Integrate waveform player, respect caption settings |
| `src/pages/Board.tsx` | Add settings gear icon + sheet state |

