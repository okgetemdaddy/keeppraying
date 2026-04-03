import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { content, title } = await req.json();
    if (!content || typeof content !== "string") {
      return new Response(JSON.stringify({ error: "content is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are a blog formatting assistant for a Christian devotional platform called KeepGrow.ing. Your ONLY job is to take raw blog content and return beautifully formatted Markdown. You must NEVER change the wording, add new content, or remove any content.

Rules:
1. Add ## headings where the author naturally shifts topics or sections
2. Add ### sub-headings for smaller topic shifts within sections  
3. Wrap direct Scripture quotes in > blockquotes, with the reference in bold below (e.g. **— Romans 8:28**)
4. Bold all Bible references like **John 3:16**, **Psalm 23:1-3**
5. Use *italics* for key spiritual phrases or emphasis the author clearly intended
6. Add --- horizontal rules between major sections (sparingly, 2-3 max)
7. Ensure proper paragraph breaks (double newlines)
8. Format any lists the author implies as proper bullet points or numbered lists
9. Keep the author's voice and tone exactly as-is
10. Do NOT add a title heading (the title is rendered separately)
11. Do NOT wrap the entire output in a code block
12. Return ONLY the formatted markdown, nothing else — no explanations, no preamble`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Format this blog post titled "${title || "Untitled"}" into beautiful markdown:\n\n${content}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Settings → Workspace → Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI formatting failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const formatted = data.choices?.[0]?.message?.content ?? content;

    return new Response(JSON.stringify({ formatted }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("format-blog error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
