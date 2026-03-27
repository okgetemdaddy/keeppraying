import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prayer_text, extended_prayer, cited_refs } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const citedSection = cited_refs && cited_refs.length > 0
      ? `\n\nSCRIPTURES EXPLICITLY CITED IN THIS PRAYER (you MUST include ALL of these in your verses list with accurate text):\n${cited_refs.join(", ")}`
      : "";

    const userContent = [
      `Prayer text:\n${prayer_text}`,
      extended_prayer ? `Extended context:\n${extended_prayer}` : "",
      citedSection,
    ].filter(Boolean).join("\n\n");

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
            content: `You are a biblical scholar assistant helping to enrich a personal prayer.

Your two jobs:
1. IDENTIFY the prayer's core spiritual themes and needs (e.g. healing, provision, peace, faith, intercession, breakthrough). Extract 3-6 lowercase single-word labels that capture these themes. Do NOT use hyphens in labels — use only simple single words.

2. SUGGEST SCRIPTURE — a mix of:
   a) Every verse explicitly cited/quoted in the prayer (these MUST all appear in your list, verbatim references).
   b) 3-5 additional supporting verses whose content directly speaks to the prayer's specific themes and needs — NOT generic verses, but ones that genuinely address what the person is praying about.

If someone prays about sickness, suggest healing verses. If about provision/finances, suggest provision verses. If about waiting/timing, suggest patience/trust verses. Read the prayer deeply and match the substance.`,
          },
          { role: "user", content: userContent },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "enrich_prayer",
              description: "Return suggested labels and scripture verses for a prayer.",
              parameters: {
                type: "object",
                properties: {
                  labels: {
                    type: "array",
                    description: "3-6 short lowercase single-word labels (no hyphens) that capture the prayer's core themes",
                    items: { type: "string" },
                  },
                  verses: {
                    type: "array",
                    description: "All explicitly cited verses plus 3-5 additional thematically matching verses (6-10 total). Must include every scripture reference found in the prayer text.",
                    items: {
                      type: "object",
                      properties: {
                        ref: { type: "string", description: "e.g. 'Philippians 4:6'" },
                        text: { type: "string", description: "Accurate short excerpt of the verse text" },
                        cited_in_prayer: { type: "boolean", description: "true if this verse was explicitly referenced/quoted in the prayer" },
                      },
                      required: ["ref", "text", "cited_in_prayer"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["labels", "verses"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "enrich_prayer" } },
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds to your workspace." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call returned");

    const result = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("enrich-prayer error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

