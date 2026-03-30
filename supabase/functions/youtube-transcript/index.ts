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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    console.log("[youtube-transcript] Request received, method:", req.method);
    // Auth
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

    // Fetch captions — try multiple extraction strategies
    const pageResp = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!pageResp.ok) {
      return new Response(JSON.stringify({ error: "Could not reach YouTube" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = await pageResp.text();
    console.log("[youtube-transcript] HTML length:", html.length,
      "has captionTracks:", html.includes("captionTracks"),
      "has ytInitialPlayerResponse:", html.includes("ytInitialPlayerResponse"));

    // Strategy 1: Direct captionTracks regex
    let captionUrl: string | null = null;
    const baseUrlMatch = html.match(/"captionTracks":\s*\[.*?"baseUrl"\s*:\s*"([^"]+)"/s);
    if (baseUrlMatch?.[1]) {
      captionUrl = baseUrlMatch[1].replace(/\\u0026/g, "&").replace(/\\"/g, '"');
      console.log("[youtube-transcript] Strategy 1 matched");
    }

    // Strategy 2: Parse ytInitialPlayerResponse
    if (!captionUrl) {
      const playerMatch = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});\s*(?:var|<\/script)/s);
      if (playerMatch) {
        try {
          const pd = JSON.parse(playerMatch[1]);
          const tracks = pd?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
          if (Array.isArray(tracks) && tracks.length > 0) {
            const chosen = tracks.find((t: any) => t.languageCode === "en" && !t.kind)
              || tracks.find((t: any) => t.languageCode === "en")
              || tracks[0];
            captionUrl = chosen.baseUrl;
            console.log("[youtube-transcript] Strategy 2 matched");
          }
        } catch (e) { console.log("[youtube-transcript] Strategy 2 parse error:", e); }
      }
    }

    // Strategy 3: YouTube innertube API (most reliable for server-side)
    if (!captionUrl) {
      console.log("[youtube-transcript] Trying innertube API...");
      try {
        const innerResp = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videoId,
            context: {
              client: { clientName: "WEB", clientVersion: "2.20250101.00.00", hl: "en" },
            },
          }),
        });
        if (innerResp.ok) {
          const innerData = await innerResp.json();
          const tracks = innerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
          console.log("[youtube-transcript] Innertube tracks:", tracks?.length ?? 0);
          if (Array.isArray(tracks) && tracks.length > 0) {
            const chosen = tracks.find((t: any) => t.languageCode === "en" && !t.kind)
              || tracks.find((t: any) => t.languageCode === "en")
              || tracks[0];
            captionUrl = chosen.baseUrl;
          }
        }
      } catch (e) { console.log("[youtube-transcript] Innertube error:", e); }
    }

    console.log("[youtube-transcript] captionUrl found:", !!captionUrl);
    if (!captionUrl) {
      return new Response(JSON.stringify({
        error: "No captions available for this video. Try a sermon that has subtitles or closed captions enabled.",
      }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const captionResp = await fetch(captionUrl);
    if (!captionResp.ok) {
      return new Response(JSON.stringify({ error: "Failed to fetch captions" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const xml = await captionResp.text();
    const segments = parseSegments(xml);

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
