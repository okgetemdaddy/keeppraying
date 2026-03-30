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

    console.log("[prayer-tts] Calling xAI TTS, text length:", text.trim().length);
    const response = await fetch("https://api.x.ai/v1/tts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${XAI_SPEAKER_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: text.trim().slice(0, 15000),
        voice_id: "sal",
        language: "en",
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("xAI TTS error:", response.status, err);
      return new Response(JSON.stringify({ error: "Failed to generate speech." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const audioBuffer = await response.arrayBuffer();
    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (e) {
    console.error("prayer-tts error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
