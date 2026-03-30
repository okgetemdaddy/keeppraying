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

    const { websiteUrl, churchName } = await req.json();
    if (!websiteUrl || typeof websiteUrl !== "string") {
      return new Response(JSON.stringify({ error: "Website URL is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch church website
    let html = "";
    try {
      const resp = await fetch(websiteUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; PrayerApp/1.0)",
          "Accept": "text/html",
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!resp.ok) throw new Error(`Site returned ${resp.status}`);
      html = await resp.text();
      // Limit to first 50k chars to avoid token limits
      html = html.slice(0, 50000);
    } catch (e) {
      console.error("[scrape] Fetch error:", e);
      // Still save the church even if scrape fails
      const { data: church, error: insertErr } = await supabase
        .from("user_churches")
        .upsert({
          user_id: user.id,
          name: churchName || "My Church",
          website_url: websiteUrl,
          scraped_data: {},
        }, { onConflict: "user_id" })
        .select()
        .single();

      if (insertErr) throw insertErr;

      return new Response(JSON.stringify({
        church,
        scraped: false,
        message: "Church saved but website could not be accessed for scraping.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Use Grok to extract structured info
    const grokApiKey = Deno.env.get("GROK_API_KEY");
    let scrapedData: Record<string, unknown> = {};

    if (grokApiKey && html) {
      try {
        const prompt = `Extract the following information from this church website HTML. Return ONLY valid JSON with these fields:
{
  "name": "Church name",
  "address": "Full street address",
  "phone": "Phone number",
  "email": "Email address",
  "service_times": ["Sunday 9am", "Sunday 11am", "Wednesday 7pm"],
  "upcoming_events": [{"name": "Event name", "date": "Date", "description": "Brief description"}],
  "pastor_name": "Senior pastor name",
  "denomination": "Denomination if mentioned",
  "mission_statement": "Mission or vision statement if found"
}

If a field is not found, use null. For arrays, use empty array [].
Return ONLY the JSON, no markdown fencing.

HTML content:
${html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "").slice(0, 30000)}`;

        const resp = await fetch("https://api.x.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${grokApiKey}`,
          },
          body: JSON.stringify({
            model: "grok-4.20-reasoning",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.2,
          }),
          signal: AbortSignal.timeout(30000),
        });

        if (resp.ok) {
          const data = await resp.json();
          const content = data.choices?.[0]?.message?.content || "";
          const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          scrapedData = JSON.parse(jsonStr);
        }
      } catch (e) {
        console.error("[scrape] Grok extraction error:", e);
      }
    }

    // Save/update church
    const finalName = (scrapedData.name as string) || churchName || "My Church";
    const { data: church, error: upsertErr } = await supabase
      .from("user_churches")
      .upsert({
        user_id: user.id,
        name: finalName,
        website_url: websiteUrl,
        address: (scrapedData.address as string) || null,
        phone: (scrapedData.phone as string) || null,
        email: (scrapedData.email as string) || null,
        scraped_data: scrapedData,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" })
      .select()
      .single();

    if (upsertErr) throw upsertErr;

    return new Response(JSON.stringify({
      church,
      scraped: true,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("[scrape] error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
