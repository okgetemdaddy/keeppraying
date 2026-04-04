import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { query, era, labels } = await req.json();
    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ error: "query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GROK_API_KEY = Deno.env.get("GROK_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let interpretation = "";
    let keywords: string[] = [];
    let themes: string[] = [];
    let scriptureRefs: string[] = [];

    // Step 1: Use Grok to interpret the query semantically
    if (GROK_API_KEY) {
      try {
        const grokRes = await fetch("https://api.x.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GROK_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "grok-4.20-0309-reasoning",
            temperature: 0.0,
            max_tokens: 2000,
            messages: [
              {
                role: "system",
                content: `You are a theological search assistant for a classical prayer library. Given a user's search query, extract:
1. keywords: important words for text matching
2. themes: spiritual/theological themes (e.g. "repentance", "praise", "intercession", "thanksgiving", "confession", "trust")
3. scripture_refs: any Bible references mentioned or implied
4. interpretation: a brief, beautiful sentence describing what the user is looking for

Respond ONLY with valid JSON: {"keywords":[],"themes":[],"scripture_refs":[],"interpretation":""}`,
              },
              { role: "user", content: query },
            ],
          }),
        });
        if (grokRes.ok) {
          const grokData = await grokRes.json();
          const content = grokData.choices?.[0]?.message?.content || "";
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            keywords = parsed.keywords || [];
            themes = parsed.themes || [];
            scriptureRefs = parsed.scripture_refs || [];
            interpretation = parsed.interpretation || "";
          }
        }
      } catch (grokErr) {
        console.error("Grok failed, falling back:", grokErr);
      }
    }

    // Step 2: Fallback to Lovable AI Gateway (Gemini Flash) if Grok didn't produce results
    if (keywords.length === 0 && themes.length === 0 && LOVABLE_API_KEY) {
      try {
        const geminiRes = await fetch("https://ai-gateway.lovable.dev/api/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            temperature: 0.0,
            max_tokens: 1500,
            messages: [
              {
                role: "system",
                content: `Extract search terms from a prayer library query. Respond ONLY with valid JSON: {"keywords":[],"themes":[],"scripture_refs":[],"interpretation":""}`,
              },
              { role: "user", content: query },
            ],
          }),
        });
        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const content = geminiData.choices?.[0]?.message?.content || "";
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            keywords = parsed.keywords || [];
            themes = parsed.themes || [];
            scriptureRefs = parsed.scripture_refs || [];
            interpretation = parsed.interpretation || "";
          }
        }
      } catch (geminiErr) {
        console.error("Gemini fallback failed:", geminiErr);
      }
    }

    // Step 3: Build intelligent query
    const searchTerms = [...keywords, ...themes, ...scriptureRefs, query].filter(Boolean);
    const orConditions = searchTerms
      .map(t => `title.ilike.%${t}%,author.ilike.%${t}%,prayer_text.ilike.%${t}%`)
      .join(",");

    let dbQuery = sb.from("classical_prayers").select("*");
    if (orConditions) {
      dbQuery = dbQuery.or(orConditions);
    }
    if (era) {
      dbQuery = dbQuery.eq("author_era", era);
    }
    dbQuery = dbQuery.order("author", { ascending: true }).limit(50);

    const { data: results, error: dbErr } = await dbQuery;
    if (dbErr) throw dbErr;

    return new Response(
      JSON.stringify({ results: results || [], interpretation }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("classical-search error:", err);
    return new Response(
      JSON.stringify({ error: "Search failed", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
