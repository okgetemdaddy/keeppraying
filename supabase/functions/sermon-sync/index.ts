import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Segment { start: number; dur: number; text: string; }

function findTimestamp(segments: Segment[], keywords: string[]): number | null {
  if (!segments?.length || !keywords?.length) return null;
  const lower = keywords.map((k) => k.toLowerCase());
  for (const seg of segments) {
    const t = seg.text.toLowerCase();
    if (lower.some((kw) => t.includes(kw))) {
      return Math.floor(seg.start);
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    console.log("[sermon-sync] Request received, method:", req.method);
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
    const { transcript, rawSegments, videoTitle, videoId, mode } = body;
    console.log("[sermon-sync] mode:", mode, "videoId:", videoId, "transcript length:", transcript?.length);

    if (!transcript || typeof transcript !== "string") {
      return new Response(JSON.stringify({ error: "transcript is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const truncated = transcript.slice(0, 12000);
    const segments: Segment[] = rawSegments || [];
    const isPremium = mode === "premium";

    if (isPremium) {
      // Premium mode: Grok API
      const GROK_API_KEY = Deno.env.get("GROK_API_KEY");
      if (!GROK_API_KEY) throw new Error("GROK_API_KEY not configured");

      const response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROK_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "grok-4.20-reasoning",
          messages: [
            {
              role: "system",
              content: "You are a Christian sermon analyst. Return only valid JSON, no markdown fences.",
            },
            {
              role: "user",
              content: `Analyze this sermon transcript and return a comprehensive breakdown.

Video Title: ${videoTitle || "(unavailable)"}

Transcript:
---
${truncated}
---

Return valid JSON with this exact structure:
{
  "sermonTitle": "string — the sermon title derived from content",
  "mainScripture": "string — the primary Bible passage (e.g. Ephesians 6:10-18)",
  "overallMessage": "string — 2-3 sentence summary of the sermon's core message",
  "subtopics": [
    {
      "title": "string — concise subtopic heading (5-10 words)",
      "explanation": "string — 2-4 sentence explanation of this point from the sermon",
      "illustration": "string or null — if the pastor used a story, analogy, or real-life example for this point, describe it in 1-2 sentences. If NO illustration was used, set this to null. Do NOT invent illustrations.",
      "application_points": ["string — 1-3 practical, personal application points that help the listener walk out this truth in daily life. Each should be a short actionable sentence (e.g. 'Speak one Scripture declaration over your family before breakfast this week')"],
      "supporting_verses": ["string — e.g. Ephesians 6:14", "Isaiah 59:17"],
      "timestamp_keywords": ["string — 2-3 distinctive words/phrases from this section to find the timestamp"]
    }
  ],
  "dailyPrayers": [
    {
      "day": "Monday",
      "prompt": "string — 2-3 sentence prayer direction based on the sermon. Guide what to pray about, don't write the prayer.",
      "verse": "string — supporting verse reference"
    }
  ]
}

Requirements:
- Generate 4-7 subtopics covering the sermon's key points
- illustration MUST be null when the pastor did not use a story or example for that point — never fabricate
- application_points MUST contain 1-3 practical, personal application steps derived from the subtopic — make them specific and actionable, not generic
- Generate exactly 6 dailyPrayers for Monday through Saturday
- All Scripture references must be real and relevant`,
            },
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
      const result = JSON.parse(cleaned);

      // Resolve timestamps from segments
      if (result.subtopics && segments.length > 0) {
        for (const sub of result.subtopics) {
          const keywords = sub.timestamp_keywords || [sub.title];
          sub.timestamp_seconds = findTimestamp(segments, keywords);
          delete sub.timestamp_keywords;
        }
      }

      // Cache premium result
      if (videoId) {
        await supabase.from("sermon_transcripts").update({
          premium_result: result,
        }).eq("video_id", videoId);
      }

      return new Response(JSON.stringify({ ...result, mode: "premium" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Standard mode: Lovable AI (Gemini)
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = `You are a faithful Christian ministry assistant. Analyze this sermon transcript.

Video Title: ${videoTitle || "(unavailable)"}

Transcript:
---
${truncated}
---

Generate the following:

1. **Sermon Notes** — A concise summary of the sermon's key themes (3-5 key points with Scripture references). Format as markdown bullet points.

2. **Prayer Prompts** — Generate exactly 4 distinct prayer prompts inspired by the sermon. Each prompt should:
   - Have a short title (5-8 words)
   - Include prayer direction text (2-3 sentences guiding WHAT to pray about)
   - Include 1-2 Scripture references
   - Include 1-2 labels from: [faith, healing, gratitude, family, guidance, strength, provision, forgiveness, worship, surrender, hope, peace, joy, love, patience, wisdom, protection, breakthrough, intercession, praise]
   - Include timestamp_keywords: 2-3 distinctive words from the relevant transcript section

Return valid JSON:
{
  "sermonTitle": "string",
  "sermonNotes": "markdown string",
  "prayers": [
    {
      "title": "string",
      "prayer_text": "string",
      "verses": "string (e.g. Romans 8:28, Psalm 23:1)",
      "labels": ["string"],
      "timestamp_keywords": ["string"]
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
    const cleanedContent = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(cleanedContent);

    // Resolve timestamps and clean up keywords
    if (result.prayers) {
      for (const p of result.prayers) {
        if (segments.length > 0) {
          const keywords = p.timestamp_keywords || [p.title];
          p.timestamp_seconds = findTimestamp(segments, keywords);
        } else {
          p.timestamp_seconds = null;
        }
        delete p.timestamp_keywords;
      }
    }

    // Cache standard result
    if (videoId) {
      await supabase.from("sermon_transcripts").update({
        analysis_result: result,
      }).eq("video_id", videoId);
    }

    return new Response(JSON.stringify({ ...result, mode: "standard" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sermon-sync error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
