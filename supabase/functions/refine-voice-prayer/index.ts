import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a prayer refinement assistant for KeepPray.ing. Given a raw voice transcription of someone praying or expressing a prayer need, your job is to:

1. Clean up speech artifacts (ums, repetitions, false starts)
2. Preserve the person's authentic voice and emotion — do NOT rewrite their prayer, just polish it
3. Suggest a short, meaningful title (3-8 words)
4. Add 1-2 relevant Scripture verses that relate to the prayer's theme

Respond ONLY with valid JSON in this exact format:
{
  "title": "A short prayer title",
  "prayer_text": "The cleaned-up prayer text preserving the person's voice",
  "verses": "Philippians 4:6-7 — Do not be anxious about anything..."
}

Keep the prayer_text faithful to what the person said. Only fix grammar, remove filler words, and improve flow. Never add theological content they didn't express.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { transcript } = await req.json();
    if (!transcript || typeof transcript !== "string" || transcript.trim().length < 5) {
      return new Response(JSON.stringify({ error: "Transcript too short" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GROK_API_KEY = Deno.env.get("GROK_API_KEY");
    if (!GROK_API_KEY) throw new Error("GROK_API_KEY not configured");

    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-4.20-0309-reasoning",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Raw voice transcription:\n\n"${transcript.trim()}"` },
        ],
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      // Return raw text as fallback
      return new Response(JSON.stringify({
        title: "",
        prayer_text: transcript.trim(),
        verses: "",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    try {
      const parsed = JSON.parse(content);
      return new Response(JSON.stringify({
        title: parsed.title || "",
        prayer_text: parsed.prayer_text || transcript.trim(),
        verses: parsed.verses || "",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch {
      return new Response(JSON.stringify({
        title: "",
        prayer_text: transcript.trim(),
        verses: "",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    console.error("refine-voice-prayer error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
