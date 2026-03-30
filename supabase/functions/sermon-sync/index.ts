import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractVideoId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/|\/embed\/|\/v\/)([a-zA-Z0-9_-]{11})/);
  return m?.[1] || null;
}

const STANDARD_PROMPT = (youtubeUrl: string) => `You are a faithful Christian ministry assistant. Analyze this sermon video.

YouTube Video URL: ${youtubeUrl}

Watch/analyze the sermon and generate the following:

1. **Sermon Notes** — A concise summary of the sermon's key themes (3-5 key points with Scripture references). Format as markdown bullet points.

2. **Prayer Prompts** — Generate exactly 4 distinct prayer prompts inspired by the sermon. Each prompt should:
   - Have a short title (5-8 words)
   - Include prayer direction text (2-3 sentences guiding WHAT to pray about)
   - Include 1-2 Scripture references
   - Include 1-2 labels from: [faith, healing, gratitude, family, guidance, strength, provision, forgiveness, worship, surrender, hope, peace, joy, love, patience, wisdom, protection, breakthrough, intercession, praise]
   - Estimate the timestamp in seconds where this topic appears in the sermon video

Return valid JSON (no markdown fences):
{
  "sermonTitle": "string",
  "sermonNotes": "markdown string",
  "prayers": [
    {
      "title": "string",
      "prayer_text": "string",
      "verses": "string (e.g. Romans 8:28, Psalm 23:1)",
      "labels": ["string"],
      "timestamp_seconds": number_or_null
    }
  ]
}`;

const PREMIUM_PROMPT = (youtubeUrl: string) => `Grok, can you give me a sermon overview with timestamps from this video: ${youtubeUrl}

Return the overview as valid JSON in this structure:
{
  "sermonTitle": "string",
  "mainScripture": "string (primary Bible passage)",
  "overallMessage": "string (2-3 sentence summary)",
  "subtopics": [
    {
      "title": "string",
      "explanation": "string",
      "illustration": "string or null (only if the pastor actually used one)",
      "application_points": ["practical takeaway"],
      "supporting_verses": ["verse reference"],
      "timestamp_seconds": number_or_null
    }
  ],
  "dailyPrayers": [
    { "day": "Monday", "prompt": "prayer direction", "verse": "verse reference" }
  ]
}

Include 4-7 subtopics and 6 daily prayers (Monday–Saturday). All subtopics, application points, and daily prayers must be derived directly from what the pastor actually preached in the sermon — do not invent or add content beyond what was taught. Only use real Scripture references.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { youtubeUrl, mode } = body;
    console.log("[sermon-sync] mode:", mode, "url:", youtubeUrl);

    if (!youtubeUrl || typeof youtubeUrl !== "string") {
      return new Response(JSON.stringify({ error: "youtubeUrl is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      return new Response(JSON.stringify({ error: "Invalid YouTube URL" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check cache
    if (videoId) {
      const cacheField = mode === "premium" ? "premium_result" : "analysis_result";
      const { data: cached } = await supabase
        .from("sermon_transcripts")
        .select(cacheField)
        .eq("video_id", videoId)
        .maybeSingle();

      const cachedResult = cached?.[cacheField];
      if (cachedResult && typeof cachedResult === "object") {
        console.log("[sermon-sync] returning cached result for", videoId);
        return new Response(JSON.stringify({ ...cachedResult as Record<string, unknown>, mode: mode === "premium" ? "premium" : "standard" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const isPremium = mode === "premium";
    let result: Record<string, unknown>;

    if (isPremium) {
      // Premium: Grok API
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
            { role: "system", content: "You are a Christian sermon analyst. Return only valid JSON, no markdown fences." },
            { role: "user", content: PREMIUM_PROMPT(youtubeUrl) },
          ],
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit reached. Please wait and try again." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const t = await response.text();
        console.error("Grok API error:", response.status, t);
        throw new Error("Premium analysis failed");
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      const cleaned = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      result = JSON.parse(cleaned);
    } else {
      // Standard: Lovable AI (Gemini)
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You are a Christian sermon analysis assistant. Return only valid JSON, no markdown fences." },
            { role: "user", content: STANDARD_PROMPT(youtubeUrl) },
          ],
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit reached. Please wait and try again." }), {
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
      const content = aiData.choices?.[0]?.message?.content || "";
      const cleaned = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      result = JSON.parse(cleaned);
    }

    // Cache result
    const cacheField = isPremium ? "premium_result" : "analysis_result";
    const videoTitle = (result.sermonTitle as string) || (result.sermon_title as string) || null;
    const { data: existing } = await supabase
      .from("sermon_transcripts")
      .select("id")
      .eq("video_id", videoId)
      .maybeSingle();

    if (existing) {
      await supabase.from("sermon_transcripts").update({
        [cacheField]: result,
        ...(videoTitle ? { video_title: videoTitle } : {}),
      }).eq("video_id", videoId);
    } else {
      await supabase.from("sermon_transcripts").insert({
        video_id: videoId,
        user_id: user.id,
        video_title: videoTitle,
        [cacheField]: result,
      });
    }

    return new Response(JSON.stringify({ ...result, mode: isPremium ? "premium" : "standard" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sermon-sync error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
