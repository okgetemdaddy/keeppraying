import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const { prompt, day, sermonTitle } = await req.json();
    if (!prompt || !day || !sermonTitle) {
      return new Response(JSON.stringify({ error: "prompt, day, and sermonTitle are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
            content: "You are a devoted Christian prayer writer. Write heartfelt, scripturally grounded prayers that are personal and conversational with God. Return only the prayer text, no commentary or markdown.",
          },
          {
            role: "user",
            content: `Write a complete prayer for ${day} based on this sermon prompt.\n\nSermon: "${sermonTitle}"\nPrompt: ${prompt}\n\nWrite a prayer that is 4-6 sentences long, deeply personal, addresses God directly, and weaves in the sermon's teaching. Include at least one Scripture reference naturally within the prayer.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("Grok API error:", response.status, t);
      throw new Error("Prayer generation failed");
    }

    const data = await response.json();
    const prayer = data.choices?.[0]?.message?.content?.trim() || "";

    return new Response(JSON.stringify({ prayer }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sermon-generate-prayer error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
