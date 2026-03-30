import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const GROK_API_KEY = Deno.env.get("GROK_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!GROK_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Server not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { reference, text, type = "summary" } = await req.json();
    if (!reference) {
      return new Response(JSON.stringify({ error: "reference required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Check DB cache first ──
    const { data: cached } = await db
      .from("verse_summaries")
      .select("summary, exegesis")
      .eq("reference", reference)
      .maybeSingle();

    if (type === "exegesis" && cached?.exegesis) {
      return new Response(JSON.stringify({ exegesis: cached.exegesis }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (type === "summary" && cached?.summary) {
      return new Response(JSON.stringify({ summary: cached.summary }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Generate via Grok AI ──
    let prompt: string;
    if (type === "exegesis") {
      prompt = `Please give an in-depth biblical exegesis of ${reference}${text ? `: "${text}"` : ""}. Explain its historical context, Greek/Hebrew meaning, theological significance, and practical application for today.`;
    } else {
      prompt = text
        ? `Give a concise, plain-English summary (2-3 sentences) of ${reference}: "${text}". Be warm, simple, and encouraging.`
        : `Give a concise, plain-English summary (2-3 sentences) of the Bible verse ${reference}. Be warm, simple, and encouraging.`;
    }

    const resp = await fetch("https://api.x.ai/v1/chat/completions", {
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
            content: type === "exegesis"
              ? "You are a biblical scholar for KeepPray.ing. Give thorough exegesis with historical context, original language insights, theological depth, and practical application."
              : "You are a friendly Bible scholar for KeepPray.ing. Give brief, warm, plain-English summaries of Bible verses. Always 2-3 sentences max. No jargon.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!resp.ok) {
      const fallback = type === "exegesis" ? "Unable to load exegesis right now." : "Unable to load summary right now.";
      console.error("Grok API error:", resp.status, await resp.text());
      return new Response(JSON.stringify({ [type]: fallback }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const result = data.choices?.[0]?.message?.content || `No ${type} available.`;

    // ── Store in DB (upsert) ──
    const upsertData: Record<string, string> = { reference };
    if (text) upsertData.verse_text = text;
    if (type === "exegesis") upsertData.exegesis = result;
    else upsertData.summary = result;

    await db.from("verse_summaries").upsert(upsertData, {
      onConflict: "reference",
      ignoreDuplicates: false,
    });

    return new Response(JSON.stringify({ [type]: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("verse-summary error:", e);
    return new Response(JSON.stringify({ summary: "Could not load verse summary.", exegesis: "Could not load exegesis." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
