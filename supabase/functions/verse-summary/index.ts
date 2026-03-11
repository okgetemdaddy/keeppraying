import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "AI not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { reference, text } = await req.json();
    if (!reference) {
      return new Response(JSON.stringify({ error: "reference required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = text
      ? `Give a concise, plain-English summary (2-3 sentences) of ${reference}: "${text}". Be warm, simple, and encouraging.`
      : `Give a concise, plain-English summary (2-3 sentences) of the Bible verse ${reference}. Be warm, simple, and encouraging.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: "You are a friendly Bible scholar for KeepPray.ing. Give brief, warm, plain-English summaries of Bible verses. Always 2-3 sentences max. No jargon.",
          },
          { role: "user", content: prompt },
        ],
        stream: false,
      }),
    });

    if (!resp.ok) {
      return new Response(JSON.stringify({ summary: "Unable to load summary right now." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const summary = data.choices?.[0]?.message?.content || "No summary available.";

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("verse-summary error:", e);
    return new Response(JSON.stringify({ summary: "Could not load verse summary." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
