import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ── Syllable counter (English heuristic, ~95% accurate) ── */
function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length <= 2) return w.length > 0 ? 1 : 0;

  // Common exceptions
  const exceptions: Record<string, number> = {
    "prayer": 1, "prayed": 1, "blessed": 2, "loved": 1, "moved": 1,
    "every": 3, "heaven": 2, "heavenly": 3, "spirit": 2, "being": 2,
    "fire": 1, "desire": 2, "inspire": 3, "entire": 3,
  };
  if (exceptions[w] !== undefined) return exceptions[w];

  let count = 0;
  const vowels = "aeiouy";
  let prevVowel = false;

  for (let i = 0; i < w.length; i++) {
    const isVowel = vowels.includes(w[i]);
    if (isVowel && !prevVowel) count++;
    prevVowel = isVowel;
  }

  // Silent-e at end
  if (w.endsWith("e") && !w.endsWith("le") && !w.endsWith("ce") && !w.endsWith("ge") && count > 1) {
    count--;
  }
  // -le at end adds a syllable if preceded by a consonant
  if (w.endsWith("le") && w.length > 2 && !vowels.includes(w[w.length - 3])) {
    // Already counted by vowel scan — no adjustment needed
  }
  // -ed ending (walked, prayed) — subtract if not preceded by t/d
  if (w.endsWith("ed") && w.length > 3) {
    const beforeEd = w[w.length - 3];
    if (beforeEd !== "t" && beforeEd !== "d") {
      count = Math.max(1, count - 1);
    }
  }
  // -tion, -sion count as 1 syllable
  if (w.match(/[ts]ion$/)) {
    // The vowel scanner already handles this correctly
  }

  return Math.max(1, count);
}

function countTextSyllables(text: string): number {
  return text.split(/\s+/).filter(Boolean).reduce((sum, w) => sum + countSyllables(w), 0);
}

/* ── MP3 duration parser (reads MPEG frame headers) ── */
function parseMp3Duration(bytes: Uint8Array): number {
  // Look for first valid MPEG frame sync (0xFF 0xE0+)
  let offset = 0;

  // Skip ID3v2 tag if present
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    const tagSize =
      ((bytes[6] & 0x7F) << 21) |
      ((bytes[7] & 0x7F) << 14) |
      ((bytes[8] & 0x7F) << 7) |
      (bytes[9] & 0x7F);
    offset = 10 + tagSize;
  }

  // MPEG bitrate tables (MPEG1 Layer 3)
  const bitrateTable = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
  const sampleRateTable = [44100, 48000, 32000, 0];

  // Find first valid frame header
  for (let i = offset; i < Math.min(bytes.length - 4, offset + 4096); i++) {
    if (bytes[i] === 0xFF && (bytes[i + 1] & 0xE0) === 0xE0) {
      const version = (bytes[i + 1] >> 3) & 0x03;      // 11 = MPEG1
      const layer = (bytes[i + 1] >> 1) & 0x03;         // 01 = Layer 3
      const bitrateIdx = (bytes[i + 2] >> 4) & 0x0F;
      const sampleIdx = (bytes[i + 2] >> 2) & 0x03;

      if (version === 3 && layer === 1 && bitrateIdx > 0 && bitrateIdx < 15 && sampleIdx < 3) {
        const bitrate = bitrateTable[bitrateIdx] * 1000;
        const dataSize = bytes.length - i; // audio data from first frame onward
        const durationSec = (dataSize * 8) / bitrate;
        console.log(`[prayer-tts] MP3 parsed: bitrate=${bitrate/1000}kbps, duration=${durationSec.toFixed(1)}s`);
        return durationSec;
      }

      // MPEG2/2.5 Layer 3 fallback
      if ((version === 2 || version === 0) && layer === 1 && bitrateIdx > 0 && bitrateIdx < 15) {
        const mpeg2Bitrates = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0];
        const bitrate = mpeg2Bitrates[bitrateIdx] * 1000;
        if (bitrate > 0) {
          const dataSize = bytes.length - i;
          const durationSec = (dataSize * 8) / bitrate;
          console.log(`[prayer-tts] MP3 parsed (MPEG2): bitrate=${bitrate/1000}kbps, duration=${durationSec.toFixed(1)}s`);
          return durationSec;
        }
      }
    }
  }

  // Fallback: estimate from file size assuming 48kbps (common for speech TTS)
  const fallback = (bytes.length * 8) / 48000;
  console.log(`[prayer-tts] MP3 header not found, fallback estimate: ${fallback.toFixed(1)}s`);
  return fallback;
}

/* ── Phrase splitter ── */
function splitIntoPhrases(text: string): string[] {
  // First split on sentence boundaries
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const phrases: string[] = [];

  for (const sentence of sentences) {
    const words = sentence.split(/\s+/);
    if (words.length <= 12) {
      phrases.push(sentence.trim());
    } else {
      // Split long sentences at commas, semicolons, or word boundaries
      const parts = sentence.split(/(?<=[,;:])\s+/);
      let buffer: string[] = [];

      for (const part of parts) {
        const partWords = part.split(/\s+/);
        if (buffer.length > 0 && buffer.join(" ").split(/\s+/).length + partWords.length > 12) {
          phrases.push(buffer.join(" ").trim());
          buffer = [part];
        } else {
          buffer.push(part);
        }
      }
      if (buffer.length > 0) {
        const remaining = buffer.join(" ").trim();
        const remWords = remaining.split(/\s+/);
        if (remWords.length > 15) {
          // Further split at ~10 word chunks
          for (let i = 0; i < remWords.length; i += 10) {
            phrases.push(remWords.slice(i, i + 10).join(" "));
          }
        } else {
          phrases.push(remaining);
        }
      }
    }
  }

  return phrases.filter(p => p.length > 0);
}

/* ── Compute timed phrases using syllable equation ── */
function computeTimedPhrases(
  text: string,
  audioDurationSec: number
): { text: string; start: number }[] {
  const phrases = splitIntoPhrases(text);
  if (phrases.length === 0) return [];

  // Count syllables per phrase
  const phraseSyllables = phrases.map(p => countTextSyllables(p));
  const totalSyllables = phraseSyllables.reduce((a, b) => a + b, 0);

  if (totalSyllables === 0) return phrases.map((p, i) => ({
    text: p,
    start: (i / phrases.length) * audioDurationSec,
  }));

  // Compute punctuation pauses
  const PAUSE_SENTENCE_END = 0.4;  // after . ! ?
  const PAUSE_COMMA = 0.2;         // after , ; :
  const PAUSE_PARAGRAPH = 0.6;     // after paragraph breaks

  let totalPauseTime = 0;
  const pauseAfter: number[] = [];

  for (let i = 0; i < phrases.length; i++) {
    let pause = 0;
    const trimmed = phrases[i].trimEnd();
    if (/[.!?]$/.test(trimmed)) pause = PAUSE_SENTENCE_END;
    else if (/[,;:]$/.test(trimmed)) pause = PAUSE_COMMA;

    // Check if next phrase starts a new paragraph (double newline in original)
    if (i < phrases.length - 1) {
      const currentEnd = text.indexOf(trimmed) + trimmed.length;
      const nextStart = text.indexOf(phrases[i + 1].trim(), currentEnd);
      if (nextStart > currentEnd) {
        const between = text.slice(currentEnd, nextStart);
        if (between.includes("\n\n") || between.includes("\r\n\r\n")) {
          pause = Math.max(pause, PAUSE_PARAGRAPH);
        }
      }
    }

    pauseAfter.push(pause);
    totalPauseTime += pause;
  }

  // Available time for actual speech (minus pauses)
  const speechTime = Math.max(audioDurationSec - totalPauseTime, audioDurationSec * 0.7);
  const secPerSyllable = speechTime / totalSyllables;

  // Compute start times
  const result: { text: string; start: number }[] = [];
  let cursor = 0;

  for (let i = 0; i < phrases.length; i++) {
    result.push({ text: phrases[i], start: Math.round(cursor * 100) / 100 });
    cursor += phraseSyllables[i] * secPerSyllable + pauseAfter[i];
  }

  console.log(`[prayer-tts] Syllable sync: ${totalSyllables} syllables, ${audioDurationSec.toFixed(1)}s audio, ${secPerSyllable.toFixed(3)}s/syl, ${phrases.length} phrases`);
  return result;
}

/* ── Main handler ── */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[prayer-tts] Request received, method:", req.method);
    const XAI_SPEAKER_KEY = Deno.env.get("XAi_Speaker");
    if (!XAI_SPEAKER_KEY) {
      console.error("[prayer-tts] XAi_Speaker secret not found");
      return new Response(JSON.stringify({ error: "xAI Speaker API key not configured." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { text, voiceId } = await req.json();
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return new Response(JSON.stringify({ error: "No prayer text provided." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prayerText = text.trim().slice(0, 15000);

    // ── Step 1: Generate TTS audio ──
    console.log("[prayer-tts] Calling xAI TTS, text length:", prayerText.length);
    const ttsResponse = await fetch("https://api.x.ai/v1/tts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${XAI_SPEAKER_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: prayerText,
        voice_id: "sal",
        language: "en",
      }),
    });

    console.log("[prayer-tts] xAI TTS response status:", ttsResponse.status);
    if (!ttsResponse.ok) {
      const err = await ttsResponse.text();
      console.error("[prayer-tts] xAI TTS error:", ttsResponse.status, err);
      return new Response(JSON.stringify({ error: "Failed to generate speech." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Read audio into buffer and convert to base64
    const audioBuffer = await ttsResponse.arrayBuffer();
    const audioBytes = new Uint8Array(audioBuffer);
    let binary = "";
    for (let i = 0; i < audioBytes.length; i++) {
      binary += String.fromCharCode(audioBytes[i]);
    }
    const audioBase64 = btoa(binary);
    console.log("[prayer-tts] Audio base64 length:", audioBase64.length);

    // ── Step 2: Deterministic syllable-based timing ──
    const audioDuration = parseMp3Duration(audioBytes);
    const timedPhrases = computeTimedPhrases(prayerText, audioDuration);

    // Include metadata for client-side calibration
    const totalSyllables = countTextSyllables(prayerText);

    // ── Return combined JSON response ──
    return new Response(
      JSON.stringify({
        audio: audioBase64,
        timedPhrases: timedPhrases.length > 0 ? timedPhrases : null,
        sync: {
          syllableCount: totalSyllables,
          estimatedDuration: audioDuration,
        },
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "private, max-age=3600",
        },
      }
    );
  } catch (e) {
    console.error("prayer-tts error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
