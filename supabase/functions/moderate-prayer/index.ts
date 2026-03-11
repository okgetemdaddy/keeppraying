import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prayer_text, title } = await req.json();
    if (!prayer_text) {
      return new Response(JSON.stringify({ approved: false, reason: "Prayer text is required." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
        messages: [
          {
            role: "system",
            content: `You are a content moderation assistant for KeepPray.ing, a Christian prayer community. 
Your task is to evaluate prayer submissions.

APPROVE a prayer if it:
- Is a genuine prayer, praise, or spiritual reflection
- Encourages faith, hope, love, or spiritual growth
- References God, Jesus, the Holy Spirit, or Scripture
- Expresses authentic human emotions (grief, joy, anxiety, gratitude)
- Is respectful, even if imperfect in theology

REJECT a prayer if it:
- Contains profanity, explicit content, or hate speech
- Promotes non-Christian religions in a way that conflicts with Christian faith
- Contains harmful, dangerous, or illegal content
- Is spam, advertising, or completely unrelated to prayer/faith
- Is mean-spirited, condemning, or judgmental toward others

Respond ONLY with valid JSON in this exact format:
{"approved": true, "reason": "Genuine Christian prayer expressing..."}
or
{"approved": false, "reason": "Contains [specific issue]..."}`
          },
          {
            role: "user",
            content: `Please moderate this prayer submission:\n\nTitle: ${title || "(no title)"}\n\nPrayer: ${prayer_text}`
          }
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      // If moderation fails, default to approve (don't block users)
      console.error("Moderation API error:", response.status);
      return new Response(JSON.stringify({ approved: true, reason: "Moderation service unavailable, defaulting to approve." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    try {
      // Extract JSON from response
      const jsonMatch = content.match(/\{.*\}/s);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch {
      // JSON parse failed, default to approve
    }

    return new Response(JSON.stringify({ approved: true, reason: "Moderation complete." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("moderate-prayer error:", e);
    return new Response(JSON.stringify({ approved: true, reason: "Moderation unavailable." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
