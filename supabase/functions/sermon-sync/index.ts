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

function detectRefusal(content: string): boolean {
  const indicators = [
    "I cannot", "I don't have the ability", "cannot complete this request",
    "I'm unable to", "As a language model", "my limitations", "I apologize, but",
    "I can't access", "I'm not able to", "I do not have access",
  ];
  return indicators.some(i => content.toLowerCase().includes(i.toLowerCase()));
}

function extractJson(raw: string): Record<string, unknown> {
  if (detectRefusal(raw)) {
    throw new Error("The AI could not analyze this video. It may be too long, private, or unavailable. Please try a different sermon link.");
  }
  const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
  try { return JSON.parse(cleaned); } catch { /* fall through */ }
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch { /* fall through */ }
  }
  throw new Error("AI returned an unexpected response. Please try again.");
}

// --- PROMPTS ---

const STANDARD_PROMPT = (youtubeUrl: string) => `You are a faithful Christian ministry assistant. Watch and analyze this entire sermon video from beginning to end — do not skip any section or stop early.

YouTube Video URL: ${youtubeUrl}

Review the full video thoroughly, then generate the following:

1. **Sermon Notes** — A concise summary of the sermon's key themes (3-5 key points with Scripture references). Format as markdown bullet points.

2. **Prayer Prompts** — Generate exactly 4 distinct prayer prompts inspired by the sermon. Each prompt should:
   - Have a short title (5-8 words)
   - Include prayer direction text (2-3 sentences guiding WHAT to pray about)
   - Include 1-2 Scripture references
   - Include 1-2 labels from: [faith, healing, gratitude, family, guidance, strength, provision, forgiveness, worship, surrender, hope, peace, joy, love, patience, wisdom, protection, breakthrough, intercession, praise]
   - Estimate the timestamp in seconds where this topic appears in the sermon video

All notes and prayer prompts must be derived directly from the actual sermon content — do not invent or add anything beyond what was taught.

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

// Premium Phase 1: Let Grok analyze freely in natural language — NO JSON requirement
const PREMIUM_GROK_PROMPT = (youtubeUrl: string) => `You are Grok, an expert at creating clean, highly usable, timestamped church service and sermon outlines from full YouTube videos.

Analyze the complete video here: ${youtubeUrl}

Create a professional, detailed breakdown of the entire service/sermon. Make the timestamps as precise as possible using the video's captions/transcript. Include:

1. **Service Outline** — Break down the full service into sections (e.g. Worship Set, Announcements, Sermon, Altar Call) with start and end timestamps (HH:MM:SS format).

2. **Sermon Title & Main Scripture** — Identify the sermon title and the primary Bible passage.

3. **Overall Message** — Write a 2-3 sentence summary of the sermon's core message.

4. **Subtopics** (4-7) — For each major point the pastor teaches:
   - Title
   - Explanation (2-4 sentences)
   - Any illustration or personal story the pastor used (only if they actually used one)
   - Practical application points
   - Supporting Scripture references
   - Approximate timestamp

5. **Daily Prayer Prompts** (Monday–Saturday) — Write 6 daily prayer directions inspired by the sermon, each with a relevant verse reference.

Use warm, encouraging, practical language. Match the level of detail and formatting from previous high-quality responses you have given on church services.

All content must be derived directly from what was actually preached — do not invent or add content beyond what was taught. Only use real Scripture references.`;

// Premium Phase 2: Gemini extracts structured JSON from Grok's raw analysis
const GEMINI_EXTRACTION_PROMPT = (rawAnalysis: string) => `You are a structured data extraction assistant. Below is a detailed sermon analysis written by another AI. Extract the information into the exact JSON structure specified. Do NOT add any information beyond what is present in the analysis. If a field cannot be determined, use null.

--- SERMON ANALYSIS ---
${rawAnalysis}
--- END ---

Extract into this exact JSON structure (return valid JSON only, no markdown fences):
{
  "sermonTitle": "string",
  "mainScripture": "string (primary Bible passage)",
  "overallMessage": "string (2-3 sentence summary)",
  "serviceOutline": [
    { "section": "string", "start": "HH:MM:SS", "end": "HH:MM:SS" }
  ],
  "subtopics": [
    {
      "title": "string",
      "explanation": "string (2-4 sentences)",
      "illustration": "string or null",
      "application_points": ["string"],
      "supporting_verses": ["string"],
      "timestamp_seconds": number_or_null
    }
  ],
  "dailyPrayers": [
    { "day": "Monday", "prompt": "string", "verse": "string" }
  ]
}

Include all subtopics and daily prayers found in the analysis. Convert any HH:MM:SS timestamps to seconds for timestamp_seconds fields.`;

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

    const isPremium = mode === "premium";

    // --- Check cache ---
    const cacheField = isPremium ? "premium_result" : "analysis_result";
    const { data: cached } = await supabase
      .from("sermon_transcripts")
      .select(`${cacheField}, raw_ai_response`)
      .eq("video_id", videoId)
      .maybeSingle();

    const cachedResult = cached?.[cacheField];
    if (cachedResult && typeof cachedResult === "object") {
      console.log("[sermon-sync] returning cached result for", videoId);
      return new Response(JSON.stringify({ ...cachedResult as Record<string, unknown>, mode: isPremium ? "premium" : "standard" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result: Record<string, unknown>;

    if (isPremium) {
      // === TWO-PHASE PREMIUM FLOW ===
      let rawAnalysis = (cached?.raw_ai_response as string) || null;

      // Phase 1: Grok generates natural-language analysis (skip if we already have it)
      if (!rawAnalysis) {
        const GROK_API_KEY = Deno.env.get("GROK_API_KEY");
        if (!GROK_API_KEY) throw new Error("GROK_API_KEY not configured");

        console.log("[sermon-sync] Phase 1: Calling Grok for raw analysis...");
        const grokResponse = await fetch("https://api.x.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GROK_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "grok-4.20-0309-reasoning",
            temperature: 0.0,
            max_tokens: 12000,
            messages: [
              { role: "user", content: PREMIUM_GROK_PROMPT(youtubeUrl) },
            ],
          }),
        });

        if (!grokResponse.ok) {
          if (grokResponse.status === 429) {
            return new Response(JSON.stringify({ error: "Rate limit reached. Please wait and try again." }), {
              status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          const t = await grokResponse.text();
          console.error("Grok API error:", grokResponse.status, t);
          throw new Error("Premium analysis failed");
        }

        const grokData = await grokResponse.json();
        rawAnalysis = grokData.choices?.[0]?.message?.content || "";
        console.log("[sermon-sync] Phase 1 complete. Raw length:", rawAnalysis.length);

        if (detectRefusal(rawAnalysis)) {
          throw new Error("The AI could not analyze this video. It may be too long, private, or unavailable. Please try a different sermon link.");
        }

        // Save raw analysis to DB immediately
        const { data: existing } = await supabase
          .from("sermon_transcripts")
          .select("id")
          .eq("video_id", videoId)
          .maybeSingle();

        if (existing) {
          await supabase.from("sermon_transcripts").update({
            raw_ai_response: rawAnalysis,
          }).eq("video_id", videoId);
        } else {
          await supabase.from("sermon_transcripts").insert({
            video_id: videoId,
            user_id: user.id,
            raw_ai_response: rawAnalysis,
          });
        }
        console.log("[sermon-sync] Phase 1 saved to DB");
      } else {
        console.log("[sermon-sync] Phase 1 skipped — raw_ai_response already cached");
      }

      // Phase 2: Gemini extracts structured JSON from the raw analysis
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

      console.log("[sermon-sync] Phase 2: Calling Gemini for JSON extraction...");
      const geminiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You are a structured data extraction assistant. Return only valid JSON, no markdown fences." },
            { role: "user", content: GEMINI_EXTRACTION_PROMPT(rawAnalysis!) },
          ],
        }),
      });

      if (!geminiResponse.ok) {
        if (geminiResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit reached. Please wait and try again." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (geminiResponse.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Please contact support." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const t = await geminiResponse.text();
        console.error("Gemini extraction error:", geminiResponse.status, t);
        throw new Error("JSON extraction failed");
      }

      const geminiData = await geminiResponse.json();
      const geminiContent = geminiData.choices?.[0]?.message?.content || "";
      console.log("[sermon-sync] Phase 2 raw (first 200):", geminiContent.substring(0, 200));
      result = extractJson(geminiContent);

    } else {
      // === STANDARD FLOW (unchanged) ===
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
      console.log("[sermon-sync] Gemini raw (first 200):", content.substring(0, 200));
      result = extractJson(content);
    }

    // --- Cache the structured result ---
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
