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

function extractCaptionUrlFromHtml(html: string): string | null {
  // Strategy 1: Direct captionTracks regex
  const baseUrlMatch = html.match(/"captionTracks":\s*\[.*?"baseUrl"\s*:\s*"([^"]+)"/s);
  if (baseUrlMatch?.[1]) {
    console.log("[yt] Strategy: regex captionTracks");
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
        console.log("[yt] Strategy: ytInitialPlayerResponse");
        return chosen.baseUrl;
      }
    } catch { /* ignore parse error */ }
  }

  return null;
}

function extractInnertubeKey(html: string): string | null {
  const m = html.match(/"INNERTUBE_API_KEY"\s*:\s*"([^"]+)"/);
  return m?.[1] || null;
}

function extractVisitorData(html: string): string | null {
  const m = html.match(/"visitorData"\s*:\s*"([^"]+)"/);
  return m?.[1] || null;
}

interface InnertubeClient {
  name: string;
  clientName: string;
  clientVersion: string;
  userAgent: string;
  extraContext?: Record<string, any>;
}

const INNERTUBE_CLIENTS: InnertubeClient[] = [
  {
    name: "ANDROID",
    clientName: "ANDROID",
    clientVersion: "19.29.37",
    userAgent: "com.google.android.youtube/19.29.37 (Linux; U; Android 11) gzip",
    extraContext: { androidSdkVersion: 30, platform: "MOBILE" },
  },
  {
    name: "IOS",
    clientName: "IOS",
    clientVersion: "19.29.1",
    userAgent: "com.google.ios.youtube/19.29.1 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X;)",
    extraContext: { deviceMake: "Apple", deviceModel: "iPhone16,2", platform: "MOBILE" },
  },
  {
    name: "TV_EMBEDDED",
    clientName: "TVHTML5_SIMPLY_EMBEDDED_PLAYER",
    clientVersion: "2.0",
    userAgent: "Mozilla/5.0",
  },
  {
    name: "WEB",
    clientName: "WEB",
    clientVersion: "2.20250101.00.00",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
  },
];

async function tryInnertube(
  videoId: string,
  client: InnertubeClient,
  apiKey?: string,
  visitorData?: string,
): Promise<string | null> {
  try {
    const url = apiKey
      ? `https://www.youtube.com/youtubei/v1/player?key=${apiKey}&prettyPrint=false`
      : "https://www.youtube.com/youtubei/v1/player?prettyPrint=false";

    const clientObj: any = {
      clientName: client.clientName,
      clientVersion: client.clientVersion,
      hl: "en",
      ...client.extraContext,
    };
    if (visitorData) clientObj.visitorData = visitorData;

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": client.userAgent,
        "X-YouTube-Client-Name": client.clientName === "ANDROID" ? "3" : client.clientName === "IOS" ? "5" : "1",
        "X-YouTube-Client-Version": client.clientVersion,
      },
      body: JSON.stringify({
        videoId,
        context: { client: clientObj },
        contentCheckOk: true,
        racyCheckOk: true,
      }),
    });

    if (!resp.ok) { await resp.text(); return null; }

    const data = await resp.json();
    const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    console.log(`[yt] Innertube ${client.name}: ${tracks?.length ?? 0} tracks`);

    if (Array.isArray(tracks) && tracks.length > 0) {
      const chosen = tracks.find((t: any) => t.languageCode === "en" && !t.kind)
        || tracks.find((t: any) => t.languageCode === "en")
        || tracks[0];
      return chosen.baseUrl;
    }
  } catch (e) {
    console.log(`[yt] Innertube ${client.name} error:`, e);
  }
  return null;
}

async function tryDirectTimedtext(videoId: string): Promise<string | null> {
  for (const kind of ["asr", ""]) {
    try {
      const params = new URLSearchParams({ v: videoId, lang: "en", fmt: "srv3" });
      if (kind) params.set("kind", kind);
      const url = `https://www.youtube.com/api/timedtext?${params}`;
      const resp = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36" },
      });
      if (!resp.ok) { await resp.text(); continue; }
      const xml = await resp.text();
      if (xml.includes("<text start=")) {
        console.log(`[yt] Direct timedtext (kind=${kind}) success`);
        return `__RAW__${xml}`;
      }
    } catch { /* continue */ }
  }
  console.log("[yt] Direct timedtext: no captions");
  return null;
}

async function fetchYouTubeHtml(videoId: string, attempt: number): Promise<string> {
  const uas = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15",
  ];
  const resp = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      "User-Agent": uas[attempt % uas.length],
      "Accept-Language": "en-US,en;q=0.9",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Cookie": "CONSENT=YES+cb.20210328-17-p0.en+FX+999; SOCS=CAISNQgDEitib3FfaWRlbnRpdHlmcm9udGVuZHVpc2VydmVyXzIwMjMwODA4LjA3X3AxGgJlbiACGgYIgJnPpwY; GPS=1",
    },
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
        await new Promise(r => setTimeout(r, 1200));
      }

      // HTML-based strategies
      let apiKey: string | null = null;
      let visitorData: string | null = null;
      try {
        const html = await fetchYouTubeHtml(videoId, attempt);
        console.log(`[yt] HTML len=${html.length} captionTracks=${html.includes("captionTracks")} ytIPR=${html.includes("ytInitialPlayerResponse")}`);

        captionUrl = extractCaptionUrlFromHtml(html);
        if (captionUrl) break;

        // Extract API key & visitor data for innertube calls
        apiKey = extractInnertubeKey(html);
        visitorData = extractVisitorData(html);
        console.log(`[yt] apiKey=${!!apiKey} visitorData=${!!visitorData}`);
      } catch (e) {
        console.log("[yt] HTML fetch error:", e);
      }

      // Innertube strategies (try all clients)
      for (const client of INNERTUBE_CLIENTS) {
        captionUrl = await tryInnertube(videoId, client, apiKey || undefined, visitorData || undefined);
        if (captionUrl) break;
      }
      if (captionUrl) break;

      // Direct timedtext API (targets auto-generated captions)
      const directResult = await tryDirectTimedtext(videoId);
      if (directResult?.startsWith("__RAW__")) {
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
