import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const { text } = await req.json();
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return new Response(JSON.stringify({ error: "No prayer text provided." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prayerText = text.trim().slice(0, 15000);

    // ── Step 1: Generate TTS audio ────────────────────────────────────────────
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

    // ── Step 2: Generate timed phrases via Grok LLM ───────────────────────────
    let timedPhrases: { text: string; start: number }[] = [];

    const GROK_API_KEY = Deno.env.get("GROK_API_KEY");
    if (GROK_API_KEY) {
      try {
        console.log("[prayer-tts] Generating timed phrases via Grok LLM");
        // Estimate audio duration from MP3 size (~16kbps for speech = ~2KB/sec)
        const estimatedDurationSec = Math.max(10, audioBytes.length / 2000);

        const llmResponse = await fetch("https://api.x.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GROK_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "grok-3-mini",
            messages: [
              {
                role: "system",
                content: "You are an expert at estimating natural prayer speech pacing. Return ONLY valid JSON, no markdown fences.",
              },
              {
                role: "user",
                content: `Given this prayer text that is being read aloud as audio approximately ${Math.round(estimatedDurationSec)} seconds long, break it into phrases and estimate when each phrase starts in the audio.

Text: """${prayerText}"""

Return this exact JSON structure:
{"phrases":[{"text":"First phrase or sentence.","start":0.0},{"text":"Next phrase.","start":3.2}]}

Rules:
- Estimate timings at a peaceful prayer pace (~130-150 words per minute)
- Add natural pauses after periods (0.5-1s), commas (0.2-0.4s), and between thoughts
- Keep phrases 5-15 words each
- The last phrase should end near ${Math.round(estimatedDurationSec)} seconds
- Return ONLY the JSON object, nothing else`,
              },
            ],
            temperature: 0.3,
            max_tokens: 4000,
          }),
        });

        if (llmResponse.ok) {
          const llmData = await llmResponse.json();
          const content = llmData.choices?.[0]?.message?.content || "";
          // Extract JSON from response (handle possible markdown fences)
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (Array.isArray(parsed.phrases)) {
              timedPhrases = parsed.phrases.map((p: any) => ({
                text: String(p.text || ""),
                start: Number(p.start) || 0,
              }));
              console.log("[prayer-tts] Generated", timedPhrases.length, "timed phrases");
            }
          }
        } else {
          console.error("[prayer-tts] Grok LLM error:", llmResponse.status);
        }
      } catch (llmErr) {
        console.error("[prayer-tts] Grok LLM phrase generation failed:", llmErr);
        // Non-fatal — we still return the audio without phrases
      }
    } else {
      console.log("[prayer-tts] GROK_API_KEY not set, skipping timed phrases");
    }

    // ── Return combined JSON response ─────────────────────────────────────────
    return new Response(
      JSON.stringify({
        audio: audioBase64,
        timedPhrases: timedPhrases.length > 0 ? timedPhrases : null,
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
