import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ── Pass 0: Google Places helpers ── */

interface GooglePlacesData {
  formatted_address?: string;
  phone?: string;
  opening_hours?: string[];
  google_maps_url?: string;
  google_rating?: number;
  google_review_count?: number;
  google_photos: string[];
  building_photo_url?: string;
  lat?: number;
  lng?: number;
}

async function fetchGooglePlacesData(
  churchName: string,
  websiteUrl: string,
  apiKey: string
): Promise<GooglePlacesData> {
  const result: GooglePlacesData = { google_photos: [] };

  try {
    // Text Search to find the place
    const searchResp = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.googleMapsUri,places.rating,places.userRatingCount,places.currentOpeningHours,places.regularOpeningHours,places.photos,places.location,places.websiteUri",
        },
        body: JSON.stringify({
          textQuery: `${churchName} church`,
          maxResultCount: 3,
        }),
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!searchResp.ok) {
      console.error("[scrape] Google Places search error:", searchResp.status, await searchResp.text());
      return result;
    }

    const searchData = await searchResp.json();
    const places = searchData.places || [];
    if (places.length === 0) return result;

    // Try to match by website URL if multiple results
    let place = places[0];
    if (places.length > 1 && websiteUrl) {
      const normalizeUrl = (u: string) =>
        u.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "").toLowerCase();
      const targetDomain = normalizeUrl(websiteUrl);
      const matched = places.find(
        (p: any) => p.websiteUri && normalizeUrl(p.websiteUri).includes(targetDomain)
      );
      if (matched) place = matched;
    }

    result.formatted_address = place.formattedAddress || undefined;
    result.phone = place.nationalPhoneNumber || place.internationalPhoneNumber || undefined;
    result.google_maps_url = place.googleMapsUri || undefined;
    result.google_rating = place.rating || undefined;
    result.google_review_count = place.userRatingCount || undefined;

    if (place.location) {
      result.lat = place.location.latitude;
      result.lng = place.location.longitude;
    }

    // Opening hours
    const hours = place.regularOpeningHours || place.currentOpeningHours;
    if (hours?.weekdayDescriptions) {
      result.opening_hours = hours.weekdayDescriptions;
    }

    // Photos — construct media URLs
    if (Array.isArray(place.photos) && place.photos.length > 0) {
      const photoUrls = place.photos.slice(0, 8).map(
        (p: any) =>
          `https://places.googleapis.com/v1/${p.name}/media?maxWidthPx=800&key=${apiKey}`
      );
      result.google_photos = photoUrls;
      result.building_photo_url = photoUrls[0];
    }
  } catch (e) {
    console.error("[scrape] Google Places error:", e);
  }

  return result;
}

/* ── Pass 1 helpers: programmatic extraction from raw HTML ── */

function extractImages(html: string, baseUrl: string): string[] {
  const urls = new Set<string>();
  for (const m of html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*/gi)) {
    try { urls.add(new URL(m[1], baseUrl).href); } catch {}
  }
  for (const m of html.matchAll(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi)) {
    try { urls.add(new URL(m[1], baseUrl).href); } catch {}
  }
  for (const m of html.matchAll(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/gi)) {
    try { urls.add(new URL(m[1], baseUrl).href); } catch {}
  }
  for (const m of html.matchAll(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)["']/gi)) {
    try { urls.add(new URL(m[1], baseUrl).href); } catch {}
  }
  for (const m of html.matchAll(/background(?:-image)?\s*:[^;]*url\(["']?([^"')]+)["']?\)/gi)) {
    try { urls.add(new URL(m[1], baseUrl).href); } catch {}
  }
  return [...urls].filter(u =>
    !u.startsWith("data:") && !u.includes("1x1") && !u.includes("pixel") && !u.includes("spacer")
  ).slice(0, 60);
}

function extractImageContext(html: string, baseUrl: string): string[] {
  const entries: string[] = [];
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
  for (const m of html.matchAll(/<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']+)["']/gi)) {
    colors.add(m[1].trim());
  }
  for (const m of html.matchAll(/--[\w-]*(primary|brand|accent|secondary|main|theme|color)[\w-]*\s*:\s*([^;}{]+)/gi)) {
    colors.add(m[2].trim());
  }
  for (const m of html.matchAll(/#[0-9a-fA-F]{3,8}(?=\b|;|\s|"|'|\))/g)) {
    if (m[0].length >= 4) colors.add(m[0]);
  }
  for (const m of html.matchAll(/rgba?\([^)]+\)/gi)) {
    colors.add(m[0]);
  }
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

    // ── Pass 0: Google Places ──
    const googleApiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
    let googleData: GooglePlacesData = { google_photos: [] };
    if (googleApiKey && churchName) {
      googleData = await fetchGooglePlacesData(churchName, websiteUrl, googleApiKey);
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
      html = html.slice(0, 80000);
    } catch (e) {
      console.error("[scrape] Fetch error:", e);
      // Still save with Google data if available
      const { data: church, error: insertErr } = await supabase
        .from("user_churches")
        .upsert({
          user_id: user.id,
          name: churchName || "My Church",
          website_url: websiteUrl,
          address: googleData.formatted_address || null,
          phone: googleData.phone || null,
          scraped_data: {
            ...googleData,
            service_times: googleData.opening_hours?.map(h => ({ label: h })) || [],
          },
        }, { onConflict: "user_id" })
        .select()
        .single();

      if (insertErr) throw insertErr;

      return new Response(JSON.stringify({
        church,
        scraped: false,
        message: "Church saved with Google data but website could not be accessed.",
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

        // Build Google Places section for the prompt
        let googleSection = "";
        if (googleData.formatted_address || googleData.opening_hours?.length) {
          googleSection = `
## GOOGLE PLACES DATA (verified, prefer these for address/hours/phone when available)
Address: ${googleData.formatted_address || "Not found"}
Phone: ${googleData.phone || "Not found"}
Hours: ${googleData.opening_hours?.join(" | ") || "Not found"}
Google Maps: ${googleData.google_maps_url || "Not found"}
Rating: ${googleData.google_rating || "N/A"}${googleData.google_review_count ? ` (${googleData.google_review_count} reviews)` : ""}
Building Photos: ${googleData.google_photos.slice(0, 4).join(", ") || "None"}
`;
        }

        const prompt = `You are an expert church website analyst with an eye for branding and visual identity. Analyze this church website HTML thoroughly and extract ALL available information. Be exhaustive — look in footers, sidebars, headers, meta tags, and structured data.

I have pre-extracted the following from the HTML:

## IMAGE URLS FOUND (with context)
${imageContextList.slice(0, 40).join("\n")}

## ALL IMAGE URLS
${imageUrls.slice(0, 50).join("\n")}

## COLOR CANDIDATES (from CSS, meta tags, inline styles)
${colorCandidates.join(", ")}
${googleSection}
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
  "building_photo_url": "URL of the church building exterior photo. Prefer Google Places building photo if available in the GOOGLE PLACES DATA section above.",
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
  "live_stream_url": "URL for live stream page if found",
  "google_maps_url": "Google Maps URL if available from GOOGLE PLACES DATA",
  "google_rating": null,
  "google_review_count": null,
  "google_photos": []
}

Rules:
- If a field is not found, use null for strings, empty array [] for arrays, empty object {} for objects.
- For logo_url, pastor_image_url, hero_image_url: ONLY pick URLs from the IMAGE URLS provided above. Do NOT invent URLs.
- For building_photo_url: Use Google Places building photo URL if provided, otherwise pick from the image list.
- For color_palette: Derive colors from the COLOR CANDIDATES above plus any colors visible in the HTML. If you cannot confidently determine a color, use a sensible default based on the overall design aesthetic. The primary color is the MOST important — get this right.
- For address, phone, and service_times: PREFER Google Places data when available in GOOGLE PLACES DATA section — it is verified and more reliable than website scraping. For service_times, if Google Hours are available, parse them into the structured format.
- For google_maps_url, google_rating, google_review_count, google_photos: Copy directly from the GOOGLE PLACES DATA if available.
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

    // Merge Google data as fallbacks (Grok should already include it, but ensure)
    if (!scrapedData.google_maps_url && googleData.google_maps_url) {
      scrapedData.google_maps_url = googleData.google_maps_url;
    }
    if (!scrapedData.google_rating && googleData.google_rating) {
      scrapedData.google_rating = googleData.google_rating;
      scrapedData.google_review_count = googleData.google_review_count;
    }
    if ((!scrapedData.google_photos || (scrapedData.google_photos as string[]).length === 0) && googleData.google_photos.length > 0) {
      scrapedData.google_photos = googleData.google_photos;
    }
    if (!scrapedData.building_photo_url && googleData.building_photo_url) {
      scrapedData.building_photo_url = googleData.building_photo_url;
    }
    if (!scrapedData.address && googleData.formatted_address) {
      scrapedData.address = googleData.formatted_address;
    }
    if (!scrapedData.phone && googleData.phone) {
      scrapedData.phone = googleData.phone;
    }
    // Fallback service times from Google hours
    if ((!scrapedData.service_times || (scrapedData.service_times as any[]).length === 0) && googleData.opening_hours?.length) {
      scrapedData.service_times = googleData.opening_hours.map(h => ({ label: h }));
    }

    // Save/update church with enriched data
    const finalName = (scrapedData.name as string) || churchName || "My Church";
    const { data: church, error: upsertErr } = await supabase
      .from("user_churches")
      .upsert({
        user_id: user.id,
        name: finalName,
        website_url: websiteUrl,
        address: (scrapedData.address as string) || googleData.formatted_address || null,
        phone: (scrapedData.phone as string) || googleData.phone || null,
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
