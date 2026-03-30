import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CACHE_TTL_DAYS = 30;

function extractVideoId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/|\/embed\/|\/v\/)([a-zA-Z0-9_-]{11})/);
  return m?.[1] || null;
}

function cleanCaptionText(text: string): string {
  return text
    .replace(/\[Music\]/gi, "")
    .replace(/\[Applause\]/gi, "")
    .replace(/\[Laughter\]/gi, "")
    .replace(/♪[^♪]*♪/g, "")
    .replace(/♪/g, "")
    .replace(/\b(um|uh|ah|er|hmm|you know)\b/gi, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\s{2,}/g, " ")
    .trim();
}

interface Segment {
  start: number;
  dur: number;
  text: string;
}

function parseSegments(xml: string): Segment[] {
  const segments: Segment[] = [];
  const regex = /<text start="([\d.]+)" dur="([\d.]+)"[^>]*>([^<]*)<\/text>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    const raw = match[3]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .trim();
    const cleaned = cleanCaptionText(raw);
    if (cleaned) {
      segments.push({
        start: parseFloat(match[1]),
        dur: parseFloat(match[2]),
        text: cleaned,
      });
    }
  }
  return segments;
}

// Extract caption URL from HTML using two strategies
function extractCaptionUrlFromHtml(html: string): string | null {
  // Strategy 1: Direct captionTracks regex
  const baseUrlMatch = html.match(/"captionTracks":\s*\[.*?"baseUrl"\s*:\s*"([^"]+)"/s);
  if (baseUrlMatch?.[1]) {
    console.log("[youtube-transcript] Strategy 1 (regex) matched");
    return baseUrlMatch[1].replace(/\\u0026/g, "&").replace(/\\"/g, '"');
  }

  // Strategy 2: Parse ytInitialPlayerResponse
  const playerMatch = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});\s*(?:var|<\/script)/s);
  if (playerMatch) {
    try {
      const pd = JSON.parse(playerMatch[1]);
      const tracks = pd?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (Array.isArray(tracks) && tracks.length > 0) {
        const chosen = tracks.find((t: any) => t.languageCode === "en" && !t.kind)
          || tracks.find((t: any) => t.languageCode === "en")
          || tracks[0];
        console.log("[youtube-transcript] Strategy 2 (playerResponse) matched");
        return chosen.baseUrl;
      }
    } catch (e) {
      console.log("[youtube-transcript] Strategy 2 parse error:", e);
    }
  }

  return null;
}

// Innertube API call with a given client config
async function tryInnertube(videoId: string, clientName: string, clientVersion: string, apiKey?: string): Promise<string | null> {
  try {
    const url = apiKey
      ? `https://www.youtube.com/youtubei/v1/player?key=${apiKey}&prettyPrint=false`
      : "https://www.youtube.com/youtubei/v1/player?prettyPrint=false";

    const body: any = {
      videoId,
      context: {
        client: { clientName, clientVersion, hl: "en" },
      },
    };

    // Android client needs additional fields
    if (clientName === "ANDROID") {
      body.context.client.androidSdkVersion = 30;
      body.context.client.platform = "MOBILE";
    }

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "com.google.android.youtube/19.29.37 (Linux; U; Android 11) gzip" },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      await resp.text();
      return null;
    }

    const data = await resp.json();
    const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    console.log(`[youtube-transcript] Innertube ${clientName} tracks:`, tracks?.length ?? 0);

    if (Array.isArray(tracks) && tracks.length > 0) {
      const chosen = tracks.find((t: any) => t.languageCode === "en" && !t.kind)
        || tracks.find((t: any) => t.languageCode === "en")
        || tracks[0];
      return chosen.baseUrl;
    }
  } catch (e) {
    console.log(`[youtube-transcript] Innertube ${clientName} error:`, e);
  }
  return null;
}

// Direct timedtext API for auto-generated captions
async function tryDirectTimedtext(videoId: string): Promise<string | null> {
  try {
    const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&kind=asr&fmt=srv3`;
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
    });
    if (!resp.ok) {
      await resp.text();
      return null;
    }
    const xml = await resp.text();
    // Check if we got actual caption data (not empty)
    if (xml.includes("<text start=")) {
      console.log("[youtube-transcript] Direct timedtext API returned captions");
      return `__RAW_XML__${xml}`;
    }
    console.log("[youtube-transcript] Direct timedtext API returned empty/no captions");
  } catch (e) {
    console.log("[youtube-transcript] Direct timedtext error:", e);
  }
  return null;
}

// Fetch YouTube page HTML with browser-like headers
async function fetchYouTubeHtml(videoId: string, attempt: number): Promise<string> {
  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15",
  ];

  const resp = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      "User-Agent": userAgents[attempt % userAgents.length],
      "Accept-Language": "en-US,en;q=0.9",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Cookie": "CONSENT=YES+cb.20210328-17-p0.en+FX+999; GPS=1",
    },
  });

  if (!resp.ok) {
    throw new Error(`YouTube returned ${resp.status}`);
  }
  return resp.text();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    console.log("[youtube-transcript] Request received, method:", req.method);

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

    const { youtubeUrl } = await req.json();
    if (!youtubeUrl || typeof youtubeUrl !== "string") {
      return new Response(JSON.stringify({ error: "YouTube URL is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const videoId = extractVideoId(youtubeUrl);
    console.log("[youtube-transcript] videoId:", videoId, "url:", youtubeUrl);
    if (!videoId) {
      return new Response(JSON.stringify({ error: "Invalid YouTube URL" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check cache
    const cutoff = new Date(Date.now() - CACHE_TTL_DAYS * 86400000).toISOString();
    const { data: cached } = await supabase
      .from("sermon_transcripts")
      .select("*")
      .eq("video_id", videoId)
      .gte("fetched_at", cutoff)
      .maybeSingle();

    console.log("[youtube-transcript] cache check:", cached ? "HIT" : "MISS");
    if (cached && cached.raw_segments && cached.full_text) {
      return new Response(JSON.stringify({
        videoId,
        videoTitle: cached.video_title || "",
        raw: cached.raw_segments,
        fullText: cached.full_text,
        cached: true,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch video title via oEmbed
    let videoTitle = "";
    try {
      const oembed = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      );
      if (oembed.ok) {
        const data = await oembed.json();
        videoTitle = data.title || "";
      }
    } catch { /* non-fatal */ }

    // === CAPTION EXTRACTION (multi-strategy with retry) ===
    let captionUrl: string | null = null;
    let rawXml: string | null = null; // for direct timedtext strategy

    for (let attempt = 0; attempt < 2 && !captionUrl; attempt++) {
      if (attempt > 0) {
        console.log("[youtube-transcript] Retry attempt", attempt);
        await new Promise(r => setTimeout(r, 1000));
      }

      // Strategy 1 & 2: HTML-based extraction
      try {
        const html = await fetchYouTubeHtml(videoId, attempt);
        console.log("[youtube-transcript] Attempt", attempt, "HTML length:", html.length,
          "has captionTracks:", html.includes("captionTracks"),
          "has ytInitialPlayerResponse:", html.includes("ytInitialPlayerResponse"));

        captionUrl = extractCaptionUrlFromHtml(html);
      } catch (e) {
        console.log("[youtube-transcript] HTML fetch error attempt", attempt, ":", e);
      }

      if (captionUrl) break;

      // Strategy 3: Innertube ANDROID (most permissive for ASR)
      captionUrl = await tryInnertube(videoId, "ANDROID", "19.29.37");
      if (captionUrl) break;

      // Strategy 4: Innertube TV_EMBEDDED
      captionUrl = await tryInnertube(videoId, "TVHTML5_SIMPLY_EMBEDDED_PLAYER", "2.0");
      if (captionUrl) break;

      // Strategy 5: Innertube WEB
      captionUrl = await tryInnertube(videoId, "WEB", "2.20250101.00.00");
      if (captionUrl) break;

      // Strategy 6: Direct timedtext API (targets auto-generated specifically)
      const directResult = await tryDirectTimedtext(videoId);
      if (directResult) {
        if (directResult.startsWith("__RAW_XML__")) {
          rawXml = directResult.slice("__RAW_XML__".length);
        } else {
          captionUrl = directResult;
        }
        break;
      }
    }

    console.log("[youtube-transcript] captionUrl found:", !!captionUrl, "rawXml found:", !!rawXml);

    if (!captionUrl && !rawXml) {
      return new Response(JSON.stringify({
        error: "No captions available for this video. Try a sermon that has subtitles or closed captions enabled.",
      }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch caption XML (unless we already have it from direct timedtext)
    let xml = rawXml;
    if (!xml && captionUrl) {
      const captionResp = await fetch(captionUrl);
      if (!captionResp.ok) {
        return new Response(JSON.stringify({ error: "Failed to fetch captions" }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      xml = await captionResp.text();
    }

    const segments = parseSegments(xml!);

    if (segments.length < 5) {
      return new Response(JSON.stringify({
        error: "Captions are too short to analyze. This may not be a sermon recording.",
      }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const fullText = segments.map((s) => s.text).join(" ");

    // Cache (upsert)
    await supabase.from("sermon_transcripts").upsert({
      video_id: videoId,
      video_title: videoTitle,
      raw_segments: segments,
      full_text: fullText,
      fetched_at: new Date().toISOString(),
      user_id: user.id,
    }, { onConflict: "video_id" });

    return new Response(JSON.stringify({
      videoId,
      videoTitle,
      raw: segments,
      fullText,
      cached: false,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("youtube-transcript error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
