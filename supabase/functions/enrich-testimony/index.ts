import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { testimony_body } = await req.json();
    if (!testimony_body || typeof testimony_body !== "string" || testimony_body.trim().length < 10) {
      return new Response(JSON.stringify({ error: "testimony_body is required (min 10 chars)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
            content:
              "You are a reverent Christian ministry assistant. Given a testimony about how God answered a prayer, generate a short, compelling title (max 60 chars) and suggest 3-5 relevant Bible verses that relate to the testimony's themes (healing, provision, peace, deliverance, faith, etc). Each verse should include the reference and the full verse text (NIV or ESV). Be warm, encouraging, and scripturally accurate.",
          },
          {
            role: "user",
            content: `Here is the testimony:\n\n${testimony_body.trim()}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "enrich_testimony",
              description: "Return a title and relevant Bible verses for a testimony.",
              parameters: {
                type: "object",
                properties: {
                  title: {
                    type: "string",
                    description: "A compelling, short title for the testimony (max 60 chars)",
                  },
                  verses: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        ref: { type: "string", description: "Bible reference e.g. Psalm 30:2" },
                        text: { type: "string", description: "Full verse text" },
                      },
                      required: ["ref", "text"],
                      additionalProperties: false,
                    },
                    description: "3-5 relevant Bible verses",
                  },
                },
                required: ["title", "verses"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "enrich_testimony" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "AI enrichment failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "No structured output from AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const enriched = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(enriched), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("enrich-testimony error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
