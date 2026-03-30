

## Replace LLM Caption Guessing with Deterministic Syllable-Based Sync

### Problem
Captions are badly out of sync because:
1. Audio duration is guessed from file size (`audioBytes.length / 2000`) — wildly inaccurate
2. Grok LLM guesses phrase start times — adds latency, cost, and is fundamentally wrong

### Solution
Replace the entire Grok LLM timing step with a deterministic syllable-counting algorithm. The actual audio duration comes from parsing the MP3 header. Each phrase's start = cumulative syllables before it × (duration / totalSyllables), with pause offsets for punctuation.

### Changes

**1. Edge function: `supabase/functions/prayer-tts/index.ts`**
- Add a `countSyllables(word)` function — English heuristic: count vowel groups, adjust for silent-e, -le, -tion, -ed (~95% accurate)
- Add `parseMp3Duration(bytes)` — read MPEG frame headers to get bitrate, compute `fileSize × 8 / bitrate` for real duration
- Add `splitIntoPhrases(text)` — break on sentence boundaries, split long sentences at commas/natural breaks (5-15 words per phrase)
- Compute timing: `rate = duration / totalSyllables`, each phrase start = cumulative syllables × rate + punctuation pauses (+0.4s after `.!?`, +0.2s after `,`)
- **Remove the entire Grok LLM call** (lines 69-138) — no more guessing, no API cost, no latency
- Return same `timedPhrases` shape (no API contract change)

**2. Overlay fallback: `src/components/TtsContemplationOverlay.tsx`**
- Replace `MS_PER_WORD_AT_1X = 150` constant with syllable-based fallback using `audioRef.current.duration` when available
- Same `countSyllables` utility used client-side for the no-phrases fallback path

**3. Self-calibrating rate: `src/hooks/useTtsPlayer.ts`**
- After each playback completes, record `{ syllableCount, actualDuration }` to localStorage
- On future plays, use the running average `seconds_per_syllable` to refine the equation over time
- This learns the xAI TTS voice's actual pacing — gets more accurate with every prayer played

### What this eliminates
- Grok LLM API call (~1-3s latency + cost per prayer)
- The inaccurate `audioBytes.length / 2000` duration guess
- The `MS_PER_WORD_AT_1X = 150` constant fallback

### Why this works
- MP3 header parsing gives actual duration (not a guess)
- Syllable counting is deterministic and fast — no network call
- Punctuation-aware pauses model natural speech gaps
- Self-calibration tightens accuracy over time as data accumulates
- Same API contract — frontend code outside these 3 files is untouched

### Files changed
1. `supabase/functions/prayer-tts/index.ts` — syllable math + MP3 parsing replaces Grok LLM
2. `src/components/TtsContemplationOverlay.tsx` — syllable-based fallback timer
3. `src/hooks/useTtsPlayer.ts` — calibration data collection

