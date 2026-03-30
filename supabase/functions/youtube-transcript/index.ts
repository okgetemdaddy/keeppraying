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
    .replace(/\[Music\]/gi, "").replace(/\[Applause\]/gi, "").replace(/\[Laughter\]/gi, "")
    .replace(/♪[^♪]*♪/g, "").replace(/♪/g, "")
    .replace(/\b(um|uh|ah|er|hmm|you know)\b/gi, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/\s{2,}/g, " ").trim();
}

interface Segment { start: number; dur: number; text: string; }

function parseSegments(xml: string): Segment[] {
  const segments: Segment[] = [];
  const regex = /<text start="([\d.]+)" dur="([\d.]+)"[^>]*>([^<]*)<\/text>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    const raw = match[3]
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'").trim();
    const cleaned = cleanCaptionText(raw);
    if (cleaned) {
      segments.push({ start: parseFloat(match[1]), dur: parseFloat(match[2]), text: cleaned });
    }
  }
  return segments;
}

// Pick best English caption track from array
function pickCaptionUrl(tracks: any[]): string | null {
  if (!Array.isArray(tracks) || tracks.length === 0) return null;
  const chosen = tracks.find((t: any) => t.languageCode === "en" && !t.kind)
    || tracks.find((t: any) => t.languageCode === "en")
    || tracks[0];
  return chosen?.baseUrl || null;
}

// Strategy: Extract from watch page HTML
function extractFromHtml(html: string): string | null {
  // Try direct regex on captionTracks
  const baseUrlMatch = html.match(/"captionTracks":\s*\[.*?"baseUrl"\s*:\s*"([^"]+)"/s);
  if (baseUrlMatch?.[1]) {
    console.log("[yt] HTML: regex captionTracks matched");
    return baseUrlMatch[1].replace(/\\u0026/g, "&").replace(/\\"/g, '"');
  }

  // Try parsing ytInitialPlayerResponse
  const playerMatch = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});\s*(?:var|<\/script)/s);
  if (playerMatch) {
    try {
      const pd = JSON.parse(playerMatch[1]);
      const url = pickCaptionUrl(pd?.captions?.playerCaptionsTracklistRenderer?.captionTracks);
      if (url) { console.log("[yt] HTML: ytInitialPlayerResponse matched"); return url; }
    } catch { /* ignore */ }
  }
  return null;
}

// Strategy: Extract from embed page HTML
async function tryEmbedPage(videoId: string): Promise<string | null> {
  try {
    const resp = await fetch(`https://www.youtube.com/embed/${videoId}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Cookie": "CONSENT=YES+cb.20210328-17-p0.en+FX+999",
      },
    });
    if (!resp.ok) { await resp.text(); return null; }
    const html = await resp.text();
    console.log(`[yt] Embed page len=${html.length} hasCaptionTracks=${html.includes("captionTracks")}`);

    // Embed page stores player data differently
    const captionMatch = html.match(/"captions"\s*:\s*(\{.+?"captionTracks"\s*:\s*\[.+?\]\s*\})/s);
    if (captionMatch) {
      try {
        // Need to find the full captions object
        const fullMatch = html.match(/"playerCaptionsTracklistRenderer"\s*:\s*\{[^}]*"captionTracks"\s*:\s*(\[.+?\])/s);
        if (fullMatch) {
          const tracks = JSON.parse(fullMatch[1].replace(/\\u0026/g, "&").replace(/\\"/g, '"'));
          const url = pickCaptionUrl(tracks);
          if (url) { console.log("[yt] Embed page: captionTracks matched"); return url; }
        }
      } catch { /* ignore */ }
    }

    // Try the same regex approach as watch page
    return extractFromHtml(html);
  } catch (e) {
    console.log("[yt] Embed page error:", e);
    return null;
  }
}

// Strategy: Innertube API
async function tryInnertube(videoId: string, clientName: string, clientVersion: string, label: string): Promise<string | null> {
  try {
    const body: any = {
      videoId,
      context: { client: { clientName, clientVersion, hl: "en" } },
      contentCheckOk: true,
      racyCheckOk: true,
    };

    const resp = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });

    if (!resp.ok) { await resp.text(); return null; }
    const data = await resp.json();
    const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    console.log(`[yt] Innertube ${label}: ${tracks?.length ?? 0} tracks`);
    return pickCaptionUrl(tracks);
  } catch (e) {
    console.log(`[yt] Innertube ${label} error:`, String(e).slice(0, 100));
    return null;
  }
}

// Strategy: Direct timedtext API for auto-generated captions
async function tryDirectTimedtext(videoId: string): Promise<string | null> {
  for (const kind of ["asr", ""]) {
    try {
      const params = new URLSearchParams({ v: videoId, lang: "en", fmt: "srv3" });
      if (kind) params.set("kind", kind);
      const resp = await fetch(`https://www.youtube.com/api/timedtext?${params}`, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        signal: AbortSignal.timeout(5000),
      });
      if (!resp.ok) { await resp.text(); continue; }
      const xml = await resp.text();
      if (xml.includes("<text start=")) {
        console.log(`[yt] Direct timedtext (kind=${kind}) success, len=${xml.length}`);
        return `__XML__${xml}`;
      }
    } catch { /* continue */ }
  }
  console.log("[yt] Direct timedtext: no captions");
  return null;
}

// Fetch watch page with consent cookies
async function fetchWatchPage(videoId: string, attempt: number): Promise<string> {
  const uas = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  ];
  // Add bpctr parameter to help bypass bot detection
  const resp = await fetch(`https://www.youtube.com/watch?v=${videoId}&bpctr=9999999999&has_verified=1`, {
    headers: {
      "User-Agent": uas[attempt % uas.length],
      "Accept-Language": "en-US,en;q=0.9",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Cookie": "CONSENT=YES+cb.20210328-17-p0.en+FX+999; SOCS=CAISNQgDEitib3FfaWRlbnRpdHlmcm9udGVuZHVpc2VydmVyXzIwMjMwODA4LjA3X3AxGgJlbiACGgYIgJnPpwY",
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!resp.ok) throw new Error(`YouTube returned ${resp.status}`);
  return resp.text();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    console.log("[yt] Request received");

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
    console.log("[yt] videoId:", videoId);
    if (!videoId) {
      return new Response(JSON.stringify({ error: "Invalid YouTube URL" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check cache
    const cutoff = new Date(Date.now() - CACHE_TTL_DAYS * 86400000).toISOString();
    const { data: cached } = await supabase
      .from("sermon_transcripts").select("*")
      .eq("video_id", videoId).gte("fetched_at", cutoff).maybeSingle();

    if (cached?.raw_segments && cached?.full_text) {
      console.log("[yt] cache HIT");
      return new Response(JSON.stringify({
        videoId, videoTitle: cached.video_title || "",
        raw: cached.raw_segments, fullText: cached.full_text, cached: true,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    console.log("[yt] cache MISS");

    // Fetch video title
    let videoTitle = "";
    try {
      const oembed = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      if (oembed.ok) { videoTitle = (await oembed.json()).title || ""; }
    } catch { /* non-fatal */ }

    // === MULTI-STRATEGY CAPTION EXTRACTION ===
    let captionUrl: string | null = null;
    let rawXml: string | null = null;

    for (let attempt = 0; attempt < 2 && !captionUrl && !rawXml; attempt++) {
      if (attempt > 0) {
        console.log("[yt] === Retry attempt ===");
        await new Promise(r => setTimeout(r, 1500));
      }

      // 1. Watch page HTML
      try {
        const html = await fetchWatchPage(videoId, attempt);
        console.log(`[yt] Watch page len=${html.length} hasCaptions=${html.includes("captionTracks")}`);
        captionUrl = extractFromHtml(html);
      } catch (e) {
        console.log("[yt] Watch page error:", e);
      }
      if (captionUrl) break;

      // 2. Embed page (less restricted by bot detection)
      captionUrl = await tryEmbedPage(videoId);
      if (captionUrl) break;

      // 3. Innertube WEB (most compatible from server)
      captionUrl = await tryInnertube(videoId, "WEB", "2.20250101.00.00", "WEB");
      if (captionUrl) break;

      // 4. Innertube WEB_EMBEDDED_PLAYER
      captionUrl = await tryInnertube(videoId, "WEB_EMBEDDED_PLAYER", "1.20250101.00.00", "WEB_EMBED");
      if (captionUrl) break;

      // 5. Innertube TVHTML5
      captionUrl = await tryInnertube(videoId, "TVHTML5", "7.20250101.00.00", "TVHTML5");
      if (captionUrl) break;

      // 6. Direct timedtext API (targets auto-generated ASR captions)
      const directResult = await tryDirectTimedtext(videoId);
      if (directResult?.startsWith("__XML__")) {
        rawXml = directResult.slice(7);
        break;
      }
    }

    console.log("[yt] Final: captionUrl=", !!captionUrl, "rawXml=", !!rawXml);

    if (!captionUrl && !rawXml) {
      return new Response(JSON.stringify({
        error: "No captions available for this video. Try a sermon that has subtitles or closed captions enabled.",
      }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

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

    await supabase.from("sermon_transcripts").upsert({
      video_id: videoId, video_title: videoTitle,
      raw_segments: segments, full_text: fullText,
      fetched_at: new Date().toISOString(), user_id: user.id,
    }, { onConflict: "video_id" });

    return new Response(JSON.stringify({
      videoId, videoTitle, raw: segments, fullText, cached: false,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[yt] error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
