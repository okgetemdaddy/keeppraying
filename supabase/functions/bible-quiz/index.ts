import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
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
            content: `You are a Bible trivia quiz generator for a Christian prayer app. Generate 10 multiple-choice questions about prayer, Scripture, and Christian faith. 

Each question must have:
- A clear, engaging question about the Bible or prayer
- Exactly 4 answer options (labeled A, B, C, D)
- One correct answer
- A brief explanation of why the answer is correct

Topics to cover: the Lord's Prayer, prayer in Scripture, famous Bible verses about prayer, the Psalms, New Testament prayer examples, spiritual disciplines, key Bible characters who prayed.

Respond ONLY with valid JSON array in this exact format:
[
  {
    "question": "What does Jesus say we should do when we pray, according to Matthew 6:6?",
    "options": ["Pray loudly in the streets", "Go into your room and close the door", "Fast for 3 days first", "Pray only in the temple"],
    "correct": 1,
    "explanation": "Jesus taught in Matthew 6:6 to go into your room, close the door, and pray to your Father in secret."
  }
]

Generate exactly 10 questions. Return only the JSON array, nothing else.`
          },
          {
            role: "user",
            content: "Generate 10 Bible trivia questions about prayer."
          }
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please contact support." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";
    
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const questions = JSON.parse(jsonMatch[0]);
        return new Response(JSON.stringify({ questions }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch (e) {
      console.error("JSON parse error:", e, content);
    }

    return new Response(JSON.stringify({ error: "Failed to parse quiz questions" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("bible-quiz error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
