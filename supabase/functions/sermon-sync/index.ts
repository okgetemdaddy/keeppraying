import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { youtubeUrl } = await req.json();
    if (!youtubeUrl || typeof youtubeUrl !== "string") {
      return new Response(JSON.stringify({ error: "YouTube URL is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Extract video ID for oEmbed metadata
    const videoIdMatch = youtubeUrl.match(/(?:v=|youtu\.be\/|\/embed\/|\/v\/)([a-zA-Z0-9_-]{11})/);
    const videoId = videoIdMatch?.[1] || "";

    // Fetch video title via oEmbed (no API key needed)
    let videoTitle = "";
    try {
      const oembed = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      if (oembed.ok) {
        const data = await oembed.json();
        videoTitle = data.title || "";
      }
    } catch { /* non-fatal */ }

    const prompt = `You are a faithful Christian ministry assistant. A user has shared a sermon video from their church.

Video URL: ${youtubeUrl}
Video Title: ${videoTitle || "(title unavailable)"}
Video ID: ${videoId}

Based on the sermon title and typical themes of sermons with this title, generate the following:

1. **Sermon Notes** — A concise, spiritually rich summary of the likely sermon themes (3-5 key points with Scripture references). Format as markdown bullet points.

2. **Prayer Prompts** — Generate exactly 4 distinct, heartfelt prayer prompts inspired by the sermon themes. Each prayer prompt should:
   - Have a short title (5-8 words)
   - Include the prayer text (2-3 sentences that guide the user on WHAT to pray about — do NOT write the prayer itself)
   - Include 1-2 relevant Scripture references
   - Include 1-2 labels from: [faith, healing, gratitude, family, guidance, strength, provision, forgiveness, worship, surrender, hope, peace, joy, love, patience, wisdom, protection, breakthrough, intercession, praise]

Return your response as valid JSON with this exact structure:
{
  "sermonTitle": "string",
  "sermonNotes": "markdown string with bullet points",
  "prayers": [
    {
      "title": "string",
      "prayer_text": "string",
      "verses": "string (e.g. Romans 8:28, Psalm 23:1)",
      "labels": ["string"]
    }
  ]
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a Christian sermon analysis assistant. Return only valid JSON, no markdown fences." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "sermon_analysis",
              description: "Return sermon notes and prayer prompts",
              parameters: {
                type: "object",
                properties: {
                  sermonTitle: { type: "string" },
                  sermonNotes: { type: "string" },
                  prayers: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        prayer_text: { type: "string" },
                        verses: { type: "string" },
                        labels: { type: "array", items: { type: "string" } },
                      },
                      required: ["title", "prayer_text", "verses", "labels"],
                    },
                  },
                },
                required: ["sermonTitle", "sermonNotes", "prayers"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "sermon_analysis" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Please wait a moment and try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please contact support." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI processing failed");
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let result;

    if (toolCall?.function?.arguments) {
      result = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback: parse content as JSON
      const content = aiData.choices?.[0]?.message?.content || "";
      const cleaned = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      result = JSON.parse(cleaned);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sermon-sync error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
