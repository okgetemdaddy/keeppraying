import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CACHE_TTL_DAYS = 30;
const CHUNK_DURATION_SEC = 600;
const MAX_AUDIO_BYTES = 20 * 1024 * 1024;

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
interface Announcement { start: number; text: string; }

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

function pickCaptionUrl(tracks: any[]): string | null {
  if (!Array.isArray(tracks) || tracks.length === 0) return null;
  const chosen = tracks.find((t: any) => t.languageCode === "en" && !t.kind)
    || tracks.find((t: any) => t.languageCode === "en")
    || tracks[0];
  return chosen?.baseUrl || null;
}

function extractFromHtml(html: string): string | null {
  const baseUrlMatch = html.match(/"captionTracks":\s*\[.*?"baseUrl"\s*:\s*"([^"]+)"/s);
  if (baseUrlMatch?.[1]) {
    return baseUrlMatch[1].replace(/\\u0026/g, "&").replace(/\\"/g, '"');
  }
  const playerMatch = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});\s*(?:var|<\/script)/s);
  if (playerMatch) {
    try {
      const pd = JSON.parse(playerMatch[1]);
      return pickCaptionUrl(pd?.captions?.playerCaptionsTracklistRenderer?.captionTracks);
    } catch { /* ignore */ }
  }
  return null;
}

async function fetchWatchPage(videoId: string): Promise<string> {
  const resp = await fetch(`https://www.youtube.com/watch?v=${videoId}&bpctr=9999999999&has_verified=1`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Cookie": "CONSENT=YES+cb.20210328-17-p0.en+FX+999; SOCS=CAISNQgDEitib3FfaWRlbnRpdHlmcm9udGVuZHVpc2VydmVyXzIwMjMwODA4LjA3X3AxGgJlbiACGgYIgJnPpwY",
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!resp.ok) throw new Error(`YouTube returned ${resp.status}`);
  return resp.text();
}

async function getInnertubePlayerData(videoId: string): Promise<any> {
  const body = {
    videoId,
    context: { client: { clientName: "WEB", clientVersion: "2.20250101.00.00", hl: "en" } },
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
  return resp.json();
}

function getAudioStreamUrl(playerData: any): { url: string; contentLength: number; approxDuration: number } | null {
  const formats = playerData?.streamingData?.adaptiveFormats;
  if (!Array.isArray(formats)) return null;
  const audioFormats = formats
    .filter((f: any) => f.mimeType?.startsWith("audio/") && f.url)
    .sort((a: any, b: any) => (a.bitrate || 999999) - (b.bitrate || 999999));
  if (audioFormats.length === 0) return null;
  const chosen = audioFormats[0];
  const contentLength = parseInt(chosen.contentLength || "0", 10);
  const approxDuration = parseInt(chosen.approxDurationMs || "0", 10) / 1000;
  console.log(`[yt] Audio stream: ${chosen.mimeType}, bitrate=${chosen.bitrate}, size=${contentLength}, dur=${approxDuration}s`);
  return { url: chosen.url, contentLength, approxDuration };
}

// ── Zyla Labs API fallback for audio URL ──
async function fetchAudioViaZyla(
  videoId: string,
  zylaApiKey: string,
): Promise<{ url: string; approxDuration: number }> {
  console.log(`[yt] Fetching audio via Zyla Labs for ${videoId}`);

  // Try the "Get Audio" endpoint first (returns download URL)
  const resp = await fetch(
    `https://zylalabs.com/api/381/youtube+to+audio+api/8884/get+audio?id=${videoId}`,
    {
      headers: {
        "Authorization": `Bearer ${zylaApiKey}`,
      },
      signal: AbortSignal.timeout(30000),
    },
  );

  if (!resp.ok) {
    const errText = await resp.text();
    console.error(`[yt] Zyla API error ${resp.status}:`, errText.slice(0, 500));
    throw new Error(`Zyla API failed: ${resp.status}`);
  }

  const data = await resp.json();
  console.log(`[yt] Zyla response keys:`, Object.keys(data));

  // Zyla returns various format links — find audio-only or lowest quality
  // The response structure has adaptiveFormats or similar
  let audioUrl: string | null = null;
  let duration = 0;

  // Try to get duration from videoDetails
  if (data.videoDetails?.lengthSeconds) {
    duration = parseInt(data.videoDetails.lengthSeconds, 10);
  }

  // Look for audio in adaptiveFormats
  if (Array.isArray(data.adaptiveFormats)) {
    const audioFormats = data.adaptiveFormats
      .filter((f: any) => f.mimeType?.startsWith("audio/") && f.url)
      .sort((a: any, b: any) => (a.bitrate || 999999) - (b.bitrate || 999999));
    if (audioFormats.length > 0) {
      audioUrl = audioFormats[0].url;
      if (!duration && audioFormats[0].approxDurationMs) {
        duration = parseInt(audioFormats[0].approxDurationMs, 10) / 1000;
      }
      console.log(`[yt] Zyla audio from adaptiveFormats: bitrate=${audioFormats[0].bitrate}`);
    }
  }

  // Try streamingData.adaptiveFormats pattern
  if (!audioUrl && data.streamingData?.adaptiveFormats) {
    const audioFormats = data.streamingData.adaptiveFormats
      .filter((f: any) => f.mimeType?.startsWith("audio/") && f.url)
      .sort((a: any, b: any) => (a.bitrate || 999999) - (b.bitrate || 999999));
    if (audioFormats.length > 0) {
      audioUrl = audioFormats[0].url;
      if (!duration && audioFormats[0].approxDurationMs) {
        duration = parseInt(audioFormats[0].approxDurationMs, 10) / 1000;
      }
      console.log(`[yt] Zyla audio from streamingData: bitrate=${audioFormats[0].bitrate}`);
    }
  }

  // Try formats array (combined audio+video, less ideal but works)
  if (!audioUrl && Array.isArray(data.formats)) {
    const withAudio = data.formats.filter((f: any) => f.url && f.mimeType?.includes("audio"));
    if (withAudio.length > 0) {
      audioUrl = withAudio[0].url;
      console.log(`[yt] Zyla audio from formats (combined stream)`);
    }
  }

  // Last resort: look for any download link in the response
  if (!audioUrl && data.link) {
    audioUrl = data.link;
    console.log(`[yt] Zyla audio from direct link`);
  }

  if (!audioUrl) {
    console.error(`[yt] Zyla response had no audio URL. Full response:`, JSON.stringify(data).slice(0, 1000));
    throw new Error("Zyla API returned no audio download URL");
  }

  return { url: audioUrl, approxDuration: duration || 2400 }; // default 40min if unknown
}

async function downloadAudioChunk(
  streamUrl: string,
  startByte: number,
  endByte: number,
): Promise<Uint8Array> {
  const resp = await fetch(streamUrl, {
    headers: { Range: `bytes=${startByte}-${endByte}` },
    signal: AbortSignal.timeout(30000),
  });
  if (!resp.ok && resp.status !== 206) {
    await resp.text();
    throw new Error(`Audio download failed: ${resp.status}`);
  }
  return new Uint8Array(await resp.arrayBuffer());
}

// Download full audio (for Zyla URLs that may not support byte-range)
async function downloadFullAudio(url: string): Promise<Uint8Array> {
  console.log(`[yt] Downloading full audio file...`);
  const resp = await fetch(url, {
    signal: AbortSignal.timeout(120000), // 2 min timeout for large files
  });
  if (!resp.ok) {
    await resp.text();
    throw new Error(`Full audio download failed: ${resp.status}`);
  }
  const buf = new Uint8Array(await resp.arrayBuffer());
  console.log(`[yt] Downloaded ${buf.length} bytes of audio`);
  return buf;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function toBase64(data: Uint8Array): string {
  let binary = "";
  const CHUNK_SIZE = 32768;
  for (let j = 0; j < data.length; j += CHUNK_SIZE) {
    const slice = data.subarray(j, j + CHUNK_SIZE);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

async function transcribeWithGrok(
  audioBase64: string,
  chunkIndex: number,
  totalChunks: number,
  offsetSeconds: number,
  chunkDurationSec: number,
  grokApiKey: string,
): Promise<{ segments: Segment[]; announcements: Announcement[] }> {
  const startTime = formatTime(offsetSeconds);
  const endTime = formatTime(offsetSeconds + chunkDurationSec);

  const prompt = `You are transcribing audio from a church sermon video. This is chunk ${chunkIndex + 1} of ${totalChunks}, covering approximately ${startTime} to ${endTime} of the video.

CRITICAL INSTRUCTIONS:
1. DISREGARD all music, worship songs, instrumental sections, and singing — do NOT transcribe these
2. SKIP pre-sermon filler (welcome greetings, "we're getting started", sound checks, tech issues)
3. SEPARATE church announcements from the sermon body
4. Transcribe the actual sermon teaching content with timestamps

Your response MUST be valid JSON with this exact structure:
{
  "segments": [
    { "start": <seconds from video start as number>, "dur": <duration in seconds as number>, "text": "<transcribed text>" }
  ],
  "announcements": [
    { "start": <seconds from video start as number>, "text": "<announcement text>" }
  ]
}

Rules for segments:
- Each segment should be ~15-30 seconds of speech
- The "start" value must be relative to the ORIGINAL VIDEO start (add ${offsetSeconds} to chunk-relative times)
- Include ALL spoken sermon content — do not summarize or skip sections
- Clean up filler words (um, uh, you know)
- Announcements about church events, services, volunteer needs go in the "announcements" array, NOT in segments

Return ONLY valid JSON, no markdown fencing, no explanation.`;

  const resp = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${grokApiKey}`,
    },
    body: JSON.stringify({
      model: "grok-4.20-reasoning",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "input_audio",
              input_audio: { data: audioBase64, format: "wav" },
            },
          ],
        },
      ],
      temperature: 0.3,
    }),
    signal: AbortSignal.timeout(120000),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error(`[yt] Grok transcription error ${resp.status}:`, errText.slice(0, 300));
    throw new Error(`Grok transcription failed: ${resp.status}`);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content || "";

  const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  try {
    const parsed = JSON.parse(jsonStr);
    return {
      segments: Array.isArray(parsed.segments) ? parsed.segments : [],
      announcements: Array.isArray(parsed.announcements) ? parsed.announcements : [],
    };
  } catch (e) {
    console.error("[yt] Failed to parse Grok response:", jsonStr.slice(0, 500));
    throw new Error("Failed to parse AI transcription response");
  }
}

// ── AI transcription using innertube byte-range chunks ──
async function aiTranscribeInnertube(
  playerData: any,
  grokApiKey: string,
): Promise<{ segments: Segment[]; announcements: Announcement[] }> {
  const audioStream = getAudioStreamUrl(playerData);
  if (!audioStream) throw new Error("No innertube audio stream available");

  const totalDuration = audioStream.approxDuration;
  const totalBytes = Math.min(audioStream.contentLength, MAX_AUDIO_BYTES);
  const bytesPerSecond = audioStream.contentLength / totalDuration;

  const chunkCount = Math.ceil(totalDuration / CHUNK_DURATION_SEC);
  const actualChunks = Math.min(chunkCount, 6);

  console.log(`[yt] Innertube AI transcription: ${actualChunks} chunks, duration=${totalDuration}s`);

  const allSegments: Segment[] = [];
  const allAnnouncements: Announcement[] = [];

  for (let i = 0; i < actualChunks; i++) {
    const offsetSeconds = i * CHUNK_DURATION_SEC;
    const chunkDuration = Math.min(CHUNK_DURATION_SEC, totalDuration - offsetSeconds);
    const startByte = Math.floor(offsetSeconds * bytesPerSecond);
    const endByte = Math.min(
      Math.floor((offsetSeconds + chunkDuration) * bytesPerSecond),
      audioStream.contentLength - 1,
    );

    console.log(`[yt] Downloading chunk ${i + 1}/${actualChunks}: bytes ${startByte}-${endByte}`);
    const audioData = await downloadAudioChunk(audioStream.url, startByte, endByte);
    const base64 = toBase64(audioData);

    console.log(`[yt] Transcribing chunk ${i + 1}/${actualChunks} with Grok (${audioData.length} bytes)`);
    const result = await transcribeWithGrok(base64, i, actualChunks, offsetSeconds, chunkDuration, grokApiKey);
    allSegments.push(...result.segments);
    allAnnouncements.push(...result.announcements);
  }

  allSegments.sort((a, b) => a.start - b.start);
  allAnnouncements.sort((a, b) => a.start - b.start);
  return { segments: allSegments, announcements: allAnnouncements };
}

// ── AI transcription using Zyla-sourced full audio ──
async function aiTranscribeZyla(
  videoId: string,
  zylaApiKey: string,
  grokApiKey: string,
): Promise<{ segments: Segment[]; announcements: Announcement[] }> {
  const { url: audioUrl, approxDuration } = await fetchAudioViaZyla(videoId, zylaApiKey);

  // Download full audio
  const fullAudio = await downloadFullAudio(audioUrl);

  // Cap at MAX_AUDIO_BYTES
  const audioToProcess = fullAudio.length > MAX_AUDIO_BYTES
    ? fullAudio.subarray(0, MAX_AUDIO_BYTES)
    : fullAudio;

  // Calculate chunks based on estimated duration
  const totalDuration = approxDuration;
  const chunkCount = Math.ceil(totalDuration / CHUNK_DURATION_SEC);
  const actualChunks = Math.min(chunkCount, 6);
  const bytesPerSecond = audioToProcess.length / totalDuration;

  console.log(`[yt] Zyla AI transcription: ${actualChunks} chunks, duration=${totalDuration}s, audio=${audioToProcess.length} bytes`);

  const allSegments: Segment[] = [];
  const allAnnouncements: Announcement[] = [];

  for (let i = 0; i < actualChunks; i++) {
    const offsetSeconds = i * CHUNK_DURATION_SEC;
    const chunkDuration = Math.min(CHUNK_DURATION_SEC, totalDuration - offsetSeconds);
    const startByte = Math.floor(offsetSeconds * bytesPerSecond);
    const endByte = Math.min(
      Math.floor((offsetSeconds + chunkDuration) * bytesPerSecond),
      audioToProcess.length - 1,
    );

    const chunkData = audioToProcess.subarray(startByte, endByte + 1);
    const base64 = toBase64(chunkData);

    console.log(`[yt] Zyla chunk ${i + 1}/${actualChunks}: ${chunkData.length} bytes, offset=${offsetSeconds}s`);
    const result = await transcribeWithGrok(base64, i, actualChunks, offsetSeconds, chunkDuration, grokApiKey);
    allSegments.push(...result.segments);
    allAnnouncements.push(...result.announcements);
  }

  allSegments.sort((a, b) => a.start - b.start);
  allAnnouncements.sort((a, b) => a.start - b.start);
  return { segments: allSegments, announcements: allAnnouncements };
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
        raw: cached.raw_segments, fullText: cached.full_text,
        cached: true, source: "captions",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    console.log("[yt] cache MISS");

    // Fetch video title
    let videoTitle = "";
    try {
      const oembed = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      if (oembed.ok) { videoTitle = (await oembed.json()).title || ""; }
    } catch { /* non-fatal */ }

    // ── STEP 1: Try caption extraction ──
    let captionUrl: string | null = null;
    let playerData: any = null;

    try {
      const html = await fetchWatchPage(videoId);
      console.log(`[yt] Watch page len=${html.length} hasCaptions=${html.includes("captionTracks")}`);
      captionUrl = extractFromHtml(html);
    } catch (e) {
      console.log("[yt] Watch page error:", e);
    }

    if (!captionUrl) {
      playerData = await getInnertubePlayerData(videoId);
      if (playerData) {
        const tracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        captionUrl = pickCaptionUrl(tracks || []);
        console.log(`[yt] Innertube captions: ${tracks?.length ?? 0} tracks, url=${!!captionUrl}`);
      }
    }

    // ── STEP 2: If captions found, parse them ──
    if (captionUrl) {
      console.log("[yt] Using caption-based transcription");
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

      await supabase.from("sermon_transcripts").upsert({
        video_id: videoId, video_title: videoTitle,
        raw_segments: segments, full_text: fullText,
        fetched_at: new Date().toISOString(), user_id: user.id,
      }, { onConflict: "video_id" });

      return new Response(JSON.stringify({
        videoId, videoTitle, raw: segments, fullText, cached: false, source: "captions",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── STEP 3: AI audio transcription fallback ──
    console.log("[yt] No captions found, attempting AI audio transcription");

    const grokApiKey = Deno.env.get("GROK_API_KEY");
    if (!grokApiKey) {
      return new Response(JSON.stringify({
        error: "No captions available and AI transcription is not configured.",
      }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Step 3a: Try innertube audio stream first
    let transcriptionResult: { segments: Segment[]; announcements: Announcement[] } | null = null;

    if (playerData) {
      try {
        console.log("[yt] Trying innertube audio stream...");
        transcriptionResult = await aiTranscribeInnertube(playerData, grokApiKey);
      } catch (e) {
        console.log("[yt] Innertube audio failed:", e instanceof Error ? e.message : e);
      }
    }

    // Step 3b: Fall back to Zyla Labs API
    if (!transcriptionResult || transcriptionResult.segments.length < 3) {
      const zylaApiKey = Deno.env.get("ZYLA_API_KEY");
      if (!zylaApiKey) {
        return new Response(JSON.stringify({
          error: "No captions or audio stream available, and Zyla API is not configured.",
        }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      try {
        console.log("[yt] Trying Zyla Labs audio fallback...");
        transcriptionResult = await aiTranscribeZyla(videoId, zylaApiKey, grokApiKey);
      } catch (e) {
        console.error("[yt] Zyla audio fallback failed:", e instanceof Error ? e.message : e);
        return new Response(JSON.stringify({
          error: `AI transcription failed: ${e instanceof Error ? e.message : "Unknown error"}. This video may not have accessible audio.`,
        }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    if (!transcriptionResult || transcriptionResult.segments.length < 3) {
      return new Response(JSON.stringify({
        error: "AI transcription produced too few segments. The audio may not contain spoken sermon content.",
      }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { segments, announcements } = transcriptionResult;
    const fullText = segments.map((s) => s.text).join(" ");

    await supabase.from("sermon_transcripts").upsert({
      video_id: videoId, video_title: videoTitle,
      raw_segments: segments, full_text: fullText,
      fetched_at: new Date().toISOString(), user_id: user.id,
    }, { onConflict: "video_id" });

    return new Response(JSON.stringify({
      videoId, videoTitle, raw: segments, fullText,
      cached: false, source: "ai-transcription",
      announcements,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("[yt] error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
