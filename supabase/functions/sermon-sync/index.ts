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

function formatTimeRange(start?: string, end?: string): string {
  if (!start && !end) return "";
  const parts: string[] = [];
  if (start) parts.push(`from ${start}`);
  if (end) parts.push(`to ${end}`);
  return `\n\nIMPORTANT: Only analyze the portion of the video ${parts.join(" ")}. Ignore everything outside this range (worship, announcements, offering, altar calls, etc.). Focus exclusively on the sermon content within this time window.`;
}

function detectRefusal(content: string): boolean {
  const head = content.trimStart().slice(0, 220).toLowerCase();
  const indicators = [
    "i cannot", "i don't have the ability", "cannot complete this request",
    "i'm unable to", "as a language model", "my limitations",
    "i apologize, but", "i can't access", "i'm not able to",
    "i do not have access", "i'm sorry, but", "i am not able",
  ];
  return indicators.some((indicator) => head.startsWith(indicator));
}

function extractJson(raw: string): Record<string, unknown> {
  if (detectRefusal(raw)) {
    throw new Error("The AI could not analyze this sermon. Please try another sermon link.");
  }
  const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();

  // Try direct parse first
  try { return JSON.parse(cleaned); } catch { /* fall through */ }

  // Try extracting JSON object
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch { /* fall through */ }

    // Fix common truncation/formatting issues
    let fixed = match[0]
      .replace(/,\s*}/g, "}") // trailing commas in objects
      .replace(/,\s*]/g, "]") // trailing commas in arrays
      .replace(/[\x00-\x1F\x7F]/g, (c) => c === "\n" || c === "\t" ? c : ""); // control chars

    // Fix truncated JSON by closing open brackets/braces
    const openBraces = (fixed.match(/{/g) || []).length;
    const closeBraces = (fixed.match(/}/g) || []).length;
    const openBrackets = (fixed.match(/\[/g) || []).length;
    const closeBrackets = (fixed.match(/\]/g) || []).length;

    if (openBraces > closeBraces || openBrackets > closeBrackets) {
      // Truncate to last complete value (last comma or colon+value)
      const lastGoodComma = fixed.lastIndexOf(",");
      const lastGoodBrace = fixed.lastIndexOf("}");
      const lastGoodBracket = fixed.lastIndexOf("]");
      const cutPoint = Math.max(lastGoodComma, lastGoodBrace, lastGoodBracket);
      if (cutPoint > fixed.length * 0.5) {
        fixed = fixed.substring(0, cutPoint);
        // Remove trailing partial key-value
        fixed = fixed.replace(/,\s*"[^"]*"?\s*:?\s*"?[^"]*$/, "");
        // Close remaining open structures
        for (let i = 0; i < openBrackets - (fixed.match(/\]/g) || []).length; i++) fixed += "]";
        for (let i = 0; i < openBraces - (fixed.match(/}/g) || []).length; i++) fixed += "}";
      }
    }

    try { return JSON.parse(fixed); } catch { /* fall through */ }
  }

  console.error("[sermon-sync] Failed to parse AI response. First 500 chars:", raw.substring(0, 500));
  throw new Error("AI returned an unexpected response. Please try again.");
}

function isEmptyPremiumResult(result: Record<string, unknown>): boolean {
  return !result.sermonTitle && !result.mainScripture && !result.overallMessage
    && Array.isArray(result.subtopics) && result.subtopics.length === 0
    && Array.isArray(result.dailyPrayers) && result.dailyPrayers.length === 0;
}

const STANDARD_PROMPT = (youtubeUrl: string, timeRange: string) => `You are a faithful Christian ministry assistant.

Watch and analyze this entire YouTube video from start to finish:
${youtubeUrl}

Analyze the video content directly. Generate the following:

1. **Sermon Notes** — A concise summary of the sermon's key themes (3-5 key points with Scripture references when present). Format as markdown bullet points.

2. **Prayer Prompts** — Generate exactly 4 distinct prayer prompts inspired by the sermon. Each prompt should:
   - Have a short title (5-8 words)
   - Include prayer direction text (2-3 sentences guiding WHAT to pray about)
   - Include 1-2 Scripture references when supported by the sermon content
   - Include 1-2 labels from: [faith, healing, gratitude, family, guidance, strength, provision, forgiveness, worship, surrender, hope, peace, joy, love, patience, wisdom, protection, breakthrough, intercession, praise]

Return valid JSON (no markdown fences):
{
  "sermonTitle": "string",
  "sermonNotes": "markdown string",
  "prayers": [
    {
      "title": "string",
      "prayer_text": "string",
      "verses": "string",
      "labels": ["string"]
    }
  ]
}`;

const PREMIUM_GROK_PROMPT = (youtubeUrl: string) => `You are an expert at creating detailed church service and sermon outlines.

Watch and analyze this entire YouTube video from start to finish:
${youtubeUrl}

Create a professional, detailed breakdown of the service/sermon.

Include:
1. Service Outline — major sections of the service in order
2. Sermon Title & Main Scripture
3. Overall Message — 2-3 sentence summary
4. Subtopics (4-7) with title, explanation, illustrations/stories mentioned, application points, and supporting verses
5. Daily Prayer Prompts (Monday-Saturday) with a short prompt and verse

If you can identify approximate timestamps, include them, but do not force or fabricate them. Focus on content accuracy over timing precision.

Use warm, encouraging, practical language. All content must come from the video — do not invent or embellish.`;

const GEMINI_EXTRACTION_PROMPT = (rawAnalysis: string) => `Extract structured data from the sermon analysis below into the exact JSON schema requested. Do not add information that is not present in the analysis. If a field cannot be determined, use null or an empty array.

--- SERMON ANALYSIS START ---
${rawAnalysis}
--- SERMON ANALYSIS END ---

Return valid JSON only in this exact shape:
{
  "sermonTitle": "string",
  "mainScripture": "string or null",
  "overallMessage": "string",
  "serviceOutline": [
    { "section": "string", "start": "HH:MM:SS or null", "end": "HH:MM:SS or null" }
  ],
  "subtopics": [
    {
      "title": "string",
      "explanation": "string",
      "illustration": "string or null",
      "application_points": ["string"],
      "supporting_verses": ["string"],
      "timestamp_seconds": null
    }
  ],
  "dailyPrayers": [
    { "day": "Monday", "prompt": "string", "verse": "string" }
  ]
}

Use null for any timestamp or field you cannot determine from the analysis.`;

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
    const { youtubeUrl, mode, sermonStart, sermonEnd } = body;
    const timeRangeInstruction = formatTimeRange(sermonStart, sermonEnd);
    const hasTimeRange = !!(sermonStart || sermonEnd);
    console.log("[sermon-sync] mode:", mode, "url:", youtubeUrl, "range:", sermonStart, "-", sermonEnd);

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
    const cacheField = isPremium ? "premium_result" : "analysis_result";

    // Check cache
    const { data: cached } = await supabase
      .from("sermon_transcripts")
      .select(`${cacheField}, raw_ai_response`)
      .eq("video_id", videoId)
      .maybeSingle();

    const cachedResult = cached?.[cacheField];
    if (cachedResult && typeof cachedResult === "object") {
      console.log("[sermon-sync] returning cached result for", videoId);
      return new Response(JSON.stringify({
        ...(cachedResult as Record<string, unknown>),
        mode: isPremium ? "premium" : "standard",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Ensure a row exists for caching
    if (!cached) {
      await supabase.from("sermon_transcripts").insert({
        video_id: videoId,
        user_id: user.id,
      });
    }

    let result: Record<string, unknown>;

    if (isPremium) {
      // Phase 1: Grok analyzes the video directly
      let rawAnalysis = typeof cached?.raw_ai_response === "string" && !detectRefusal(cached.raw_ai_response)
        ? cached.raw_ai_response
        : null;

      if (!rawAnalysis) {
        const GROK_API_KEY = Deno.env.get("GROK_API_KEY");
        if (!GROK_API_KEY) throw new Error("GROK_API_KEY not configured");

        console.log("[sermon-sync] Phase 1: Calling Grok to analyze video...");
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
          const errorText = await grokResponse.text();
          console.error("Grok API error:", grokResponse.status, errorText);
          throw new Error("Premium analysis failed");
        }

        const grokData = await grokResponse.json();
        rawAnalysis = grokData.choices?.[0]?.message?.content || "";
        console.log("[sermon-sync] Phase 1 complete. Raw length:", rawAnalysis.length);

        if (detectRefusal(rawAnalysis)) {
          throw new Error("The AI could not analyze this sermon. Please try another sermon link.");
        }

        await supabase.from("sermon_transcripts").update({
          raw_ai_response: rawAnalysis,
        }).eq("video_id", videoId);
      }

      // Phase 2: Gemini extracts structured JSON
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
          model: "google/gemini-3-flash-preview",
          max_tokens: 8000,
          messages: [
            { role: "system", content: "You extract structured sermon data and return only valid JSON." },
            { role: "user", content: GEMINI_EXTRACTION_PROMPT(rawAnalysis) },
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
        const errorText = await geminiResponse.text();
        console.error("Gemini extraction error:", geminiResponse.status, errorText);
        throw new Error("JSON extraction failed");
      }

      const geminiData = await geminiResponse.json();
      const geminiContent = geminiData.choices?.[0]?.message?.content || "";
      console.log("[sermon-sync] Phase 2 raw (first 200):", geminiContent.substring(0, 200));
      result = extractJson(geminiContent);

      if (isEmptyPremiumResult(result)) {
        throw new Error("Premium analysis returned no sermon details. Please try again.");
      }
    } else {
      // Standard: Gemini analyzes the video directly
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          max_tokens: 8000,
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
        const errorText = await response.text();
        console.error("AI gateway error:", response.status, errorText);
        throw new Error("AI processing failed");
      }

      const aiData = await response.json();
      const content = aiData.choices?.[0]?.message?.content || "";
      console.log("[sermon-sync] Gemini raw (first 200):", content.substring(0, 200));
      result = extractJson(content);
    }

    // Cache result
    const videoTitle = (result.sermonTitle as string) || (result.sermon_title as string) || null;
    await supabase.from("sermon_transcripts").update({
      [cacheField]: result,
      ...(videoTitle ? { video_title: videoTitle } : {}),
    }).eq("video_id", videoId);

    return new Response(JSON.stringify({
      ...result,
      mode: isPremium ? "premium" : "standard",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("sermon-sync error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
