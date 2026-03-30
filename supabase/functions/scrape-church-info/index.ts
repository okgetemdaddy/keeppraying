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
      html = html.slice(0, 50000);
    } catch (e) {
      console.error("[scrape] Fetch error:", e);
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

    // Use Grok to extract rich structured info
    const grokApiKey = Deno.env.get("GROK_API_KEY");
    let scrapedData: Record<string, unknown> = {};

    if (grokApiKey && html) {
      try {
        // Strip scripts/styles and truncate for the prompt
        const cleanHtml = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
          .slice(0, 35000);

        const prompt = `You are an expert church information extractor. Analyze this church website HTML thoroughly and extract ALL available information. Be exhaustive — look in footers, sidebars, headers, meta tags, and structured data.

Return ONLY valid JSON with these fields:

{
  "name": "Official church name",
  "denomination": "Denomination or network affiliation if mentioned",
  "pastor_name": "Senior/Lead pastor name",
  "pastor_title": "Their title (e.g. Senior Pastor, Lead Pastor, Rev.)",
  "address": "Full street address including city, state, zip",
  "phone": "Phone number",
  "email": "Email address",
  "service_times": [
    {"day": "Sunday", "time": "9:00 AM", "label": "Traditional Service"},
    {"day": "Sunday", "time": "11:00 AM", "label": "Contemporary Worship"},
    {"day": "Wednesday", "time": "7:00 PM", "label": "Bible Study"}
  ],
  "upcoming_events": [
    {"name": "Event name", "date": "Date or date range", "time": "Time if available", "description": "Brief description", "location": "Location if different from main address"}
  ],
  "social_media": {
    "facebook": "URL or null",
    "instagram": "URL or null",
    "youtube": "URL or null",
    "twitter": "URL or null",
    "tiktok": "URL or null",
    "spotify": "URL or null"
  },
  "about_us": "A 2-3 sentence summary of the church's mission, vision, or 'about us' text. Capture their heart and identity.",
  "mission_statement": "Official mission or vision statement if explicitly stated",
  "values": ["Core value 1", "Core value 2"],
  "ministries": [
    {"name": "Ministry name", "description": "Brief description"}
  ],
  "unique_features": [
    "What makes this church special or distinctive — notable programs, community initiatives, unique worship style, history, size, campus details, etc."
  ],
  "giving_url": "URL for online giving/donations if found",
  "app_url": "URL for church app if found",
  "live_stream_url": "URL for live stream page if found"
}

Rules:
- If a field is not found, use null for strings, empty array [] for arrays, empty object {} for objects.
- For service_times, include ALL services, Bible studies, youth groups, prayer meetings — anything with a recurring schedule.
- For social_media, extract the actual URLs, not just the platform names.
- For unique_features, be insightful — identify 2-5 things that make this church distinct from a generic church.
- For about_us, write warmly and faithfully — capture the church's voice.
- Return ONLY the JSON, no markdown fencing, no commentary.

HTML content:
${cleanHtml}`;

        const resp = await fetch("https://api.x.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${grokApiKey}`,
          },
          body: JSON.stringify({
            model: "grok-4.20-0309-reasoning",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.0,
            max_tokens: 12000,
          }),
          signal: AbortSignal.timeout(60000),
        });

        if (resp.ok) {
          const data = await resp.json();
          const content = data.choices?.[0]?.message?.content || "";
          const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          scrapedData = JSON.parse(jsonStr);
        } else {
          console.error("[scrape] Grok API error:", resp.status, await resp.text());
        }
      } catch (e) {
        console.error("[scrape] Grok extraction error:", e);
      }
    }

    // Save/update church with enriched data
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
