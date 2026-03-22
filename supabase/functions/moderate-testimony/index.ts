import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { testimony_body } = await req.json();

    if (!testimony_body || testimony_body.trim().length < 5) {
      return new Response(JSON.stringify({ approved: false, reason: "Testimony is too short." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      // Fail open — approve but flag it
      return new Response(JSON.stringify({ approved: true, flagged: true, reason: "Moderation unavailable — flagged for review." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a faith-based content moderator for KeepPraying.ing, a Christian prayer platform. 
Your role is to review user-submitted testimonies about God answering their prayers.

APPROVE if the testimony:
- Shares a genuine personal story of faith, answered prayer, or spiritual growth
- Expresses gratitude to God, relief, healing, or restored hope
- Describes a transformation, miracle, or divine intervention
- Is sincere even if brief (e.g. "God healed my mom!" is acceptable)

REJECT if the testimony:
- Contains profanity, hate speech, or obscene content
- Denies God answered the prayer, mocks faith, or is blasphemous
- Promotes evil, harm, occult, or non-Christian spiritual practices
- Is clearly spam, off-topic, or unrelated to prayer/faith
- Attacks other users, religions, or groups with hostility

Respond ONLY with valid JSON in this exact format:
{"approved": true} or {"approved": false, "reason": "brief reason for rejection"}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Review this testimony:\n\n"${testimony_body}"` },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      if (response.status === 429 || response.status === 402) {
        // Rate limited or no credits — fail open with flag
        return new Response(JSON.stringify({ approved: true, flagged: true, reason: "Moderation temporarily unavailable." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() ?? "";

    // Parse the JSON response
    let result: { approved: boolean; reason?: string };
    try {
      // Strip markdown code blocks if present
      const clean = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      result = JSON.parse(clean);
    } catch {
      // If we can't parse, default to approved
      result = { approved: true };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("moderate-testimony error:", err);
    // Fail open — approve but flag for safety
    return new Response(JSON.stringify({ approved: true, flagged: true, reason: "Moderation error — flagged for review." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
