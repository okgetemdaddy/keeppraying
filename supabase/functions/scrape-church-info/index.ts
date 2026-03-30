import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ── Pass 1 helpers: programmatic extraction from raw HTML ── */

function extractImages(html: string, baseUrl: string): string[] {
  const urls = new Set<string>();

  // <img src="..."> with alt text for context
  for (const m of html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*/gi)) {
    try { urls.add(new URL(m[1], baseUrl).href); } catch {}
  }

  // <meta property="og:image" content="...">
  for (const m of html.matchAll(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi)) {
    try { urls.add(new URL(m[1], baseUrl).href); } catch {}
  }
  // reverse order too: content before property
  for (const m of html.matchAll(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/gi)) {
    try { urls.add(new URL(m[1], baseUrl).href); } catch {}
  }

  // <link rel="icon" href="..."> / apple-touch-icon
  for (const m of html.matchAll(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)["']/gi)) {
    try { urls.add(new URL(m[1], baseUrl).href); } catch {}
  }

  // CSS background-image: url(...)
  for (const m of html.matchAll(/background(?:-image)?\s*:[^;]*url\(["']?([^"')]+)["']?\)/gi)) {
    try { urls.add(new URL(m[1], baseUrl).href); } catch {}
  }

  // Filter out data URIs, tiny tracking pixels, SVG sprites
  return [...urls].filter(u =>
    !u.startsWith("data:") &&
    !u.includes("1x1") &&
    !u.includes("pixel") &&
    !u.includes("spacer")
  ).slice(0, 60);
}

function extractImageContext(html: string, baseUrl: string): string[] {
  const entries: string[] = [];
  // Get img tags with their alt, class, id, and parent context
  for (const m of html.matchAll(/<img[^>]+src=["']([^"']+)["']([^>]*)>/gi)) {
    try {
      const url = new URL(m[1], baseUrl).href;
      const attrs = m[2] || "";
      const alt = attrs.match(/alt=["']([^"']*)["']/i)?.[1] || "";
      const cls = attrs.match(/class=["']([^"']*)["']/i)?.[1] || "";
      const id = attrs.match(/id=["']([^"']*)["']/i)?.[1] || "";
      entries.push(`URL: ${url} | alt: "${alt}" | class: "${cls}" | id: "${id}"`);
    } catch {}
  }
  return entries.slice(0, 50);
}

function extractColors(html: string): string[] {
  const colors = new Set<string>();

  // <meta name="theme-color" content="...">
  for (const m of html.matchAll(/<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']+)["']/gi)) {
    colors.add(m[1].trim());
  }

  // CSS custom properties that look brand-related
  for (const m of html.matchAll(/--[\w-]*(primary|brand|accent|secondary|main|theme|color)[\w-]*\s*:\s*([^;}{]+)/gi)) {
    colors.add(m[2].trim());
  }

  // Hex colors
  for (const m of html.matchAll(/#[0-9a-fA-F]{3,8}(?=\b|;|\s|"|'|\))/g)) {
    if (m[0].length >= 4) colors.add(m[0]);
  }

  // rgb/rgba
  for (const m of html.matchAll(/rgba?\([^)]+\)/gi)) {
    colors.add(m[0]);
  }

  // hsl/hsla
  for (const m of html.matchAll(/hsla?\([^)]+\)/gi)) {
    colors.add(m[0]);
  }

  return [...colors].slice(0, 40);
}

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

    // ── Fetch church website ──
    let html = "";
    try {
      const resp = await fetch(websiteUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; PrayerApp/1.0)",
          "Accept": "text/html",
        },
        signal: AbortSignal.timeout(15000),
      });
      if (!resp.ok) throw new Error(`Site returned ${resp.status}`);
      html = await resp.text();
      html = html.slice(0, 80000); // increased for better image/color extraction
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

    // ── Pass 1: Programmatic extraction ──
    const imageUrls = extractImages(html, websiteUrl);
    const imageContextList = extractImageContext(html, websiteUrl);
    const colorCandidates = extractColors(html);

    // ── Pass 2: Grok-powered intelligent extraction ──
    const grokApiKey = Deno.env.get("GROK_API_KEY");
    let scrapedData: Record<string, unknown> = {};

    if (grokApiKey && html) {
      try {
        const cleanHtml = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
          .slice(0, 40000);

        const prompt = `You are an expert church website analyst with an eye for branding and visual identity. Analyze this church website HTML thoroughly and extract ALL available information. Be exhaustive — look in footers, sidebars, headers, meta tags, and structured data.

I have pre-extracted the following from the HTML:

## IMAGE URLS FOUND (with context)
${imageContextList.slice(0, 40).join("\n")}

## ALL IMAGE URLS
${imageUrls.slice(0, 50).join("\n")}

## COLOR CANDIDATES (from CSS, meta tags, inline styles)
${colorCandidates.join(", ")}

Return ONLY valid JSON with these fields:

{
  "name": "Official church name",
  "denomination": "Denomination or network affiliation if mentioned",
  "pastor_name": "Senior/Lead pastor name",
  "pastor_title": "Their title (e.g. Senior Pastor, Lead Pastor, Rev.)",
  "address": "Full street address including city, state, zip",
  "phone": "Phone number",
  "email": "Email address",
  "logo_url": "The URL of the church's MAIN LOGO from the image list above. Look for images with 'logo' in alt, class, id, or filename. Pick the primary/header logo, NOT a footer duplicate or tiny favicon.",
  "pastor_image_url": "URL of a photo of the senior/lead pastor from the image list. Look for images near pastor names, on 'about' or 'staff' sections, with 'pastor', 'staff', 'headshot' in context.",
  "hero_image_url": "URL of a prominent hero/banner image from the image list — the main visual representing the church.",
  "favicon_url": "URL of the favicon or apple-touch-icon from the image list.",
  "color_palette": {
    "primary": "The church's PRIMARY brand color as hex (e.g. #2B5EA7). Determine from the color candidates, logo colors, header/nav background, or prominent accent colors. This is the main color that represents the church.",
    "secondary": "A secondary/complementary color as hex. Often used for backgrounds, secondary buttons, or supporting elements.",
    "accent": "An accent/highlight color as hex. Used for CTAs, links, or highlights.",
    "background": "The main background color as hex (often white or a light shade).",
    "text": "The primary text color as hex (often dark gray or black)."
  },
  "service_times": [
    {"day": "Sunday", "time": "9:00 AM", "label": "Traditional Service"},
    {"day": "Sunday", "time": "11:00 AM", "label": "Contemporary Worship"}
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
  "about_us": "A warm, 2-4 sentence summary capturing the church's heart, identity, culture, and what a visitor would experience. Write in third person.",
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
- For logo_url, pastor_image_url, hero_image_url: ONLY pick URLs from the IMAGE URLS provided above. Do NOT invent URLs.
- For color_palette: Derive colors from the COLOR CANDIDATES above plus any colors visible in the HTML. If you cannot confidently determine a color, use a sensible default based on the overall design aesthetic. The primary color is the MOST important — get this right.
- For service_times, include ALL services, Bible studies, youth groups, prayer meetings — anything with a recurring schedule.
- For social_media, extract the actual URLs, not just the platform names.
- For unique_features, be insightful — identify 2-5 things that make this church distinct.
- For about_us, capture the church's warmth and personality.
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
          signal: AbortSignal.timeout(90000),
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
