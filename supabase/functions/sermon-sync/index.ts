import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractVideoId(url: string): string | null {
  const trimmed = url.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const m = trimmed.match(/(?:v=|youtu\.be\/|\/embed\/|\/v\/|\/shorts\/|\/live\/)([a-zA-Z0-9_-]{11})/);
  return m?.[1] || null;
}

function detectRefusal(content: string): boolean {
  const head = content.trimStart().slice(0, 220).toLowerCase();
  const indicators = [
    "i cannot", "i don't have the ability", "cannot complete this request",
    "i'm unable to", "as a language model", "my limitations",
    "i apologize, but", "i can't access", "i'm not able to",
    "i do not have access", "i'm sorry, but", "i am not able",
  ];
  return indicators.some((indicator) => head.startsWith(indicator));
}

function extractJson(raw: string): Record<string, unknown> {
  if (detectRefusal(raw)) {
    throw new Error("The AI could not analyze this sermon. Please try another sermon link.");
  }
  const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();

  try { return JSON.parse(cleaned); } catch { /* fall through */ }

  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch { /* fall through */ }

    let fixed = match[0]
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]")
      .replace(/[\x00-\x1F\x7F]/g, (c) => c === "\n" || c === "\t" ? c : "");

    const openBraces = (fixed.match(/{/g) || []).length;
    const closeBraces = (fixed.match(/}/g) || []).length;
    const openBrackets = (fixed.match(/\[/g) || []).length;
    const closeBrackets = (fixed.match(/\]/g) || []).length;

    if (openBraces > closeBraces || openBrackets > closeBrackets) {
      const lastGoodComma = fixed.lastIndexOf(",");
      const lastGoodBrace = fixed.lastIndexOf("}");
      const lastGoodBracket = fixed.lastIndexOf("]");
      const cutPoint = Math.max(lastGoodComma, lastGoodBrace, lastGoodBracket);
      if (cutPoint > fixed.length * 0.5) {
        fixed = fixed.substring(0, cutPoint);
        fixed = fixed.replace(/,\s*"[^"]*"?\s*:?\s*"?[^"]*$/, "");
        for (let i = 0; i < openBrackets - (fixed.match(/\]/g) || []).length; i++) fixed += "]";
        for (let i = 0; i < openBraces - (fixed.match(/}/g) || []).length; i++) fixed += "}";
      }
    }

    try { return JSON.parse(fixed); } catch { /* fall through */ }
  }

  console.error("[sermon-sync] Failed to parse AI response. First 500 chars:", raw.substring(0, 500));
  throw new Error("AI returned an unexpected response. Please try again.");
}

function isEmptyPremiumResult(result: Record<string, unknown>): boolean {
  return !result.sermonTitle && !result.mainScripture && !result.overallMessage
    && Array.isArray(result.subtopics) && result.subtopics.length === 0
    && Array.isArray(result.dailyPrayers) && result.dailyPrayers.length === 0;
}

/* ─── Transcript helpers (captions-first, no Cobalt/AssemblyAI) ─── */

/** Parse timed-text json3 response into { text, timed } */
function parseJson3Captions(data: Record<string, unknown>): { text: string; timed: Array<{ offset: number; duration: number; text: string }> } | null {
  const events = (data as any).events;
  if (!Array.isArray(events)) return null;
  const segments = events.filter((e: any) => e.segs);
  if (segments.length === 0) return null;
  const timed = segments.map((seg: any) => ({
    offset: seg.tStartMs || 0,
    duration: seg.dDurationMs || 0,
    text: (seg.segs?.map((s: any) => s.utf8).join("") || "").replace(/\n/g, " "),
  }));
  const text = timed.map((s) => s.text).join(" ").replace(/\s+/g, " ").trim();
  return text.length > 50 ? { text, timed } : null;
}

/** Extract YouTube transcript using captions-first approach (no third-party services) */
async function getYouTubeTranscript(videoId: string): Promise<{
  text: string;
  timed: Array<{ offset: number; duration: number; text: string }>;
}> {
  const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

  // === Tier 1: Direct timedtext API ===
  console.log("[sermon-sync] Tier 1: Trying direct timedtext API...");
  for (const lang of ["en", "en-US", "en-GB"]) {
    try {
      const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=json3`;
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (res.ok) {
        const data = await res.json();
        const parsed = parseJson3Captions(data);
        if (parsed) {
          console.log(`[sermon-sync] Tier 1 success (lang=${lang}). Text length: ${parsed.text.length}`);
          return parsed;
        }
      }
    } catch (e) {
      console.warn(`[sermon-sync] Tier 1 (${lang}) error:`, e instanceof Error ? e.message : String(e));
    }
  }

  // Also try auto-generated captions (ASR)
  try {
    const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&kind=asr&fmt=json3`;
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.ok) {
      const data = await res.json();
      const parsed = parseJson3Captions(data);
      if (parsed) {
        console.log(`[sermon-sync] Tier 1 success (asr). Text length: ${parsed.text.length}`);
        return parsed;
      }
    }
  } catch (_) {}

  // === Tier 2: Innertube player API to get captionTracks ===
  console.log("[sermon-sync] Tier 2: Trying Innertube player API...");
  try {
    const playerRes = await fetch("https://www.youtube.com/youtubei/v1/player", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": UA },
      body: JSON.stringify({
        context: {
          client: {
            clientName: "WEB",
            clientVersion: "2.20250301.01.00",
            hl: "en",
            gl: "US",
          },
        },
        videoId,
      }),
    });

    if (playerRes.ok) {
      const playerData = await playerRes.json();
      const captionTracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

      if (Array.isArray(captionTracks) && captionTracks.length > 0) {
        console.log(`[sermon-sync] Found ${captionTracks.length} caption track(s)`);

        // Prefer English, then any track
        const track =
          captionTracks.find((t: any) => t.languageCode === "en") ||
          captionTracks.find((t: any) => t.languageCode?.startsWith("en")) ||
          captionTracks[0];

        if (track?.baseUrl) {
          const separator = track.baseUrl.includes("?") ? "&" : "?";
          const trackUrl = `${track.baseUrl}${separator}fmt=json3`;
          console.log(`[sermon-sync] Fetching caption track: lang=${track.languageCode}, kind=${track.kind || "manual"}`);

          const trackRes = await fetch(trackUrl, { headers: { "User-Agent": UA } });
          if (trackRes.ok) {
            const trackData = await trackRes.json();
            const parsed = parseJson3Captions(trackData);
            if (parsed) {
              console.log(`[sermon-sync] Tier 2 success. Text length: ${parsed.text.length}`);
              return parsed;
            }
          }
        }
      } else {
        console.log("[sermon-sync] Tier 2: No caption tracks found in player response");
      }
    } else {
      console.warn("[sermon-sync] Tier 2: Player API returned", playerRes.status);
    }
  } catch (e) {
    console.warn("[sermon-sync] Tier 2 error:", e instanceof Error ? e.message : String(e));
  }

  // === Tier 3: Zyla API (paid fallback) ===
  const ZYLA_KEY = Deno.env.get("ZYLA_API_KEY");
  if (ZYLA_KEY) {
    console.log("[sermon-sync] Tier 3: Trying Zyla API...");
    try {
      const zylaRes = await fetch(
        `https://zylalabs.com/api/5765/youtube+transcriptor+api/7094/transcript?video_id=${videoId}`,
        { headers: { "Authorization": `Bearer ${ZYLA_KEY}` } }
      );
      if (zylaRes.ok) {
        const zylaData = await zylaRes.json();
        if (Array.isArray(zylaData)) {
          const timed = zylaData.map((seg: any) => ({
            offset: Math.round((seg.start || seg.offset || 0) * 1000),
            duration: Math.round((seg.duration || 0) * 1000),
            text: (seg.text || "").replace(/\n/g, " "),
          }));
          const text = timed.map((s) => s.text).join(" ").replace(/\s+/g, " ").trim();
          if (text.length > 50) {
            console.log(`[sermon-sync] Tier 3 success. Text length: ${text.length}`);
            return { text, timed };
          }
        } else if (zylaData?.transcript) {
          const text = typeof zylaData.transcript === "string" ? zylaData.transcript : JSON.stringify(zylaData.transcript);
          if (text.length > 50) {
            console.log(`[sermon-sync] Tier 3 success (text only). Text length: ${text.length}`);
            return { text, timed: [] };
          }
        }
      } else {
        console.warn("[sermon-sync] Tier 3: Zyla returned", zylaRes.status);
      }
    } catch (e) {
      console.warn("[sermon-sync] Tier 3 error:", e instanceof Error ? e.message : String(e));
    }
  }

  throw new Error("Could not extract transcript. This video may not have captions available. Please try a different sermon link.");
}

/** Extract transcript within a time range using segment-level timestamps */
function extractTimeRange(
  timed: Array<{ offset: number; duration: number; text: string }>,
  startTime?: string,
  endTime?: string
): string {
  if (!startTime && !endTime) return "";

  const parseTime = (t: string): number => {
    const parts = t.trim().split(":").map(Number);
    if (parts.length === 3) return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
    if (parts.length === 2) return (parts[0] * 60 + parts[1]) * 1000;
    return 0;
  };

  const startMs = startTime ? parseTime(startTime) : 0;
  const endMs = endTime ? parseTime(endTime) : Infinity;

  const filtered = timed
    .filter((seg) => {
      const segEnd = seg.offset + seg.duration;
      return seg.offset >= startMs && (segEnd <= endMs || seg.offset <= endMs);
    })
    .map((seg) => seg.text);

  return filtered.join(" ");
}

/* ─── Prompts (updated to use transcript instead of URL) ─── */

const STANDARD_PROMPT_TRANSCRIPT = (transcript: string, chaptersInfo: string) => `You are a faithful Christian ministry assistant.

Here is the full transcript of a sermon:

--- TRANSCRIPT START ---
${transcript}
--- TRANSCRIPT END ---

${chaptersInfo ? `Auto-detected chapters:\n${chaptersInfo}\n` : ""}

Analyze this sermon transcript. Generate the following:

1. **Sermon Notes** — A concise summary of the sermon's key themes (3-5 key points with Scripture references when present). Format as markdown bullet points.

2. **Prayer Prompts** — Generate exactly 4 distinct prayer prompts inspired by the sermon. Each prompt should:
   - Have a short title (5-8 words)
   - Include prayer direction text (2-3 sentences guiding WHAT to pray about)
   - Include 1-2 Scripture references when supported by the sermon content
   - Include 1-2 labels from: [faith, healing, gratitude, family, guidance, strength, provision, forgiveness, worship, surrender, hope, peace, joy, love, patience, wisdom, protection, breakthrough, intercession, praise]

Return valid JSON (no markdown fences):
{
  "sermonTitle": "string",
  "sermonNotes": "markdown string",
  "prayers": [
    {
      "title": "string",
      "prayer_text": "string",
      "verses": "string",
      "labels": ["string"]
    }
  ]
}`;

const PREMIUM_GROK_PROMPT_TRANSCRIPT = (transcript: string, chaptersInfo: string) => `You are an expert at creating detailed church service and sermon outlines.

Here is the full transcript of a sermon/service:

--- TRANSCRIPT START ---
${transcript}
--- TRANSCRIPT END ---

${chaptersInfo ? `Auto-detected chapters from transcription:\n${chaptersInfo}\n` : ""}

Create a professional, detailed breakdown of the service/sermon.

Include:
1. Service Outline — major sections of the service in order (use the auto-detected chapters and speaker changes to identify worship, announcements, sermon, altar call, etc.)
2. Sermon Title & Main Scripture
3. Overall Message — 2-3 sentence summary
4. Subtopics (4-7) with title, explanation, illustrations/stories mentioned, application points, and supporting verses
5. Daily Prayer Prompts (Monday-Saturday) with a short prompt and verse

Use the transcript faithfully — all content must come from what was actually said.
Use warm, encouraging, practical language.`;

const GEMINI_EXTRACTION_PROMPT = (rawAnalysis: string) => `You are extracting structured sermon data from a raw AI analysis. The analysis may be informal, use markdown, or have varying formats. Extract every piece of information you can find — even partial data is valuable.

--- SERMON ANALYSIS START ---
${rawAnalysis}
--- SERMON ANALYSIS END ---

Extract ALL available information into this JSON shape. Use the actual content from the analysis — do not return empty/null if there is data present. If you find sermon points, themes, or teachings, map them to subtopics. If you find any prayer-related content, map it to dailyPrayers.

Return valid JSON only:
{
  "sermonTitle": "string (use main topic/theme if no explicit title)",
  "mainScripture": "string or null",
  "overallMessage": "string (summarize the main teaching)",
  "serviceOutline": [
    { "section": "string", "start": "HH:MM:SS or null", "end": "HH:MM:SS or null" }
  ],
  "subtopics": [
    {
      "title": "string",
      "explanation": "string",
      "illustration": "string or null",
      "application_points": ["string"],
      "supporting_verses": ["string"],
      "timestamp_seconds": null
    }
  ],
  "dailyPrayers": [
    { "day": "Monday", "prompt": "string", "verse": "string" }
  ]
}

Use null for any timestamp or field you truly cannot determine from the analysis.`;

/* ─── Legacy prompts (fallback when no transcript available) ─── */

const STANDARD_PROMPT_LEGACY = (youtubeUrl: string, timeRange: string) => `You are a faithful Christian ministry assistant.

Watch and analyze this entire YouTube video from start to finish:
${youtubeUrl}
${timeRange}
Analyze the video content directly. Generate the following:

1. **Sermon Notes** — A concise summary of the sermon's key themes (3-5 key points with Scripture references when present). Format as markdown bullet points.

2. **Prayer Prompts** — Generate exactly 4 distinct prayer prompts inspired by the sermon. Each prompt should:
   - Have a short title (5-8 words)
   - Include prayer direction text (2-3 sentences guiding WHAT to pray about)
   - Include 1-2 Scripture references when supported by the sermon content
   - Include 1-2 labels from: [faith, healing, gratitude, family, guidance, strength, provision, forgiveness, worship, surrender, hope, peace, joy, love, patience, wisdom, protection, breakthrough, intercession, praise]

Return valid JSON (no markdown fences):
{
  "sermonTitle": "string",
  "sermonNotes": "markdown string",
  "prayers": [
    {
      "title": "string",
      "prayer_text": "string",
      "verses": "string",
      "labels": ["string"]
    }
  ]
}`;

const PREMIUM_GROK_PROMPT_LEGACY = (youtubeUrl: string, timeRange: string) => `You are an expert at creating detailed church service and sermon outlines.

Watch and analyze this entire YouTube video from start to finish:
${youtubeUrl}
${timeRange}

Create a professional, detailed breakdown of the service/sermon.

Include:
1. Service Outline — major sections of the service in order
2. Sermon Title & Main Scripture
3. Overall Message — 2-3 sentence summary
4. Subtopics (4-7) with title, explanation, illustrations/stories mentioned, application points, and supporting verses
5. Daily Prayer Prompts (Monday-Saturday) with a short prompt and verse

If you can identify approximate timestamps, include them, but do not force or fabricate them. Focus on content accuracy over timing precision.

Use warm, encouraging, practical language. All content must come from the video — do not invent or embellish.`;

function formatTimeRange(start?: string, end?: string): string {
  if (!start && !end) return "";
  const parts: string[] = [];
  if (start) parts.push(`from ${start}`);
  if (end) parts.push(`to ${end}`);
  return `\n\nIMPORTANT: Only analyze the portion of the video ${parts.join(" ")}. Ignore everything outside this range (worship, announcements, offering, altar calls, etc.). Focus exclusively on the sermon content within this time window.`;
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

    const body = await req.json();
    const { youtubeUrl, mode, sermonStart, sermonEnd } = body;
    const hasTimeRange = !!(sermonStart || sermonEnd);
    console.log("[sermon-sync] mode:", mode, "url:", youtubeUrl, "range:", sermonStart, "-", sermonEnd);

    if (!youtubeUrl || typeof youtubeUrl !== "string") {
      return new Response(JSON.stringify({ error: "youtubeUrl is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      return new Response(JSON.stringify({ error: "Invalid YouTube URL" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isPremium = mode === "premium";
    const cacheField = isPremium ? "premium_result" : "analysis_result";

    // Check cache (skip when time range is provided)
    if (!hasTimeRange) {
      const { data: cached } = await supabase
        .from("sermon_transcripts")
        .select(`${cacheField}, raw_ai_response, full_text`)
        .eq("video_id", videoId)
        .maybeSingle();

      const cachedResult = cached?.[cacheField];
      if (cachedResult && typeof cachedResult === "object") {
        console.log("[sermon-sync] returning cached result for", videoId);
        return new Response(JSON.stringify({
          ...(cachedResult as Record<string, unknown>),
          mode: isPremium ? "premium" : "standard",
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Ensure a row exists for caching
    const { data: existingRow } = await supabase
      .from("sermon_transcripts")
      .select("raw_ai_response, full_text, raw_segments")
      .eq("video_id", videoId)
      .maybeSingle();

    if (!existingRow) {
      await supabase.from("sermon_transcripts").insert({
        video_id: videoId,
        user_id: user.id,
      });
    }

    /* ─── Phase 1: Get transcript (from cache or fresh via YouTube captions) ─── */
    let fullText = typeof existingRow?.full_text === "string" && existingRow.full_text.length > 100
      ? existingRow.full_text : null;
    let timedSegments: Array<{ offset: number; duration: number; text: string }> = [];

    // Try to recover timed segments from cache
    if (existingRow?.raw_segments) {
      const cached = existingRow.raw_segments as any;
      if (Array.isArray(cached?.timed)) {
        timedSegments = cached.timed;
      } else if (Array.isArray(cached?.words)) {
        // Convert old AssemblyAI word format to timed segments
        timedSegments = (cached.words as Array<{ text: string; start: number; end: number }>).map((w) => ({
          offset: w.start,
          duration: w.end - w.start,
          text: w.text,
        }));
      }
    }

    let usedTranscript = false;

    if (!fullText) {
      // Get transcript via YouTube captions (no Cobalt/AssemblyAI needed)
      try {
        const transcript = await getYouTubeTranscript(videoId);
        fullText = transcript.text;
        timedSegments = transcript.timed;

        // Cache transcript
        await supabase.from("sermon_transcripts").update({
          full_text: fullText,
          raw_segments: { timed: timedSegments } as unknown as Record<string, unknown>,
        }).eq("video_id", videoId);

        usedTranscript = true;
        console.log("[sermon-sync] Transcript cached. Length:", fullText.length);
      } catch (e) {
        console.warn("[sermon-sync] Transcript extraction failed, falling back to legacy:", e instanceof Error ? e.message : String(e));
        // Will fall back to legacy "watch the video" approach
      }
    } else {
      usedTranscript = true;
      console.log("[sermon-sync] Using cached transcript. Length:", fullText.length);
    }

    /* ─── Prepare transcript text for AI ─── */
    let transcriptForAI = fullText || "";

    // If time range specified and we have timed segments, extract just that range
    if (hasTimeRange && usedTranscript && timedSegments.length > 0) {
      const rangeText = extractTimeRange(timedSegments, sermonStart, sermonEnd);
      if (rangeText.length > 50) {
        transcriptForAI = rangeText;
        console.log("[sermon-sync] Using time-range filtered transcript. Length:", rangeText.length);
      }
    }

    // Truncate very long transcripts to avoid token limits (~40k words ≈ ~50k tokens)
    if (transcriptForAI.length > 160_000) {
      transcriptForAI = transcriptForAI.substring(0, 160_000) + "\n\n[Transcript truncated for length]";
    }

    // Format chapters info for context (from timed segments if available)
    let chaptersInfo = "";
    // No auto-chapters from YouTube captions, but timed segments provide time context

    let result: Record<string, unknown>;

    if (isPremium) {
      /* ─── Premium: Grok analyzes transcript → Gemini extracts JSON ─── */

      // Phase 3a: Grok analysis
      let rawAnalysis = !hasTimeRange && typeof existingRow?.raw_ai_response === "string" && !detectRefusal(existingRow.raw_ai_response)
        ? existingRow.raw_ai_response
        : null;

      if (!rawAnalysis) {
        const GROK_API_KEY = Deno.env.get("GROK_API_KEY");
        if (!GROK_API_KEY) throw new Error("GROK_API_KEY not configured");

        console.log("[sermon-sync] Phase 3a: Calling Grok to analyze", usedTranscript ? "transcript" : "video URL", "...");

        const prompt = usedTranscript
          ? PREMIUM_GROK_PROMPT_TRANSCRIPT(transcriptForAI, chaptersInfo)
          : PREMIUM_GROK_PROMPT_LEGACY(youtubeUrl, formatTimeRange(sermonStart, sermonEnd));

        const grokResponse = await fetch("https://api.x.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GROK_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "grok-4.20-0309-reasoning",
            temperature: 0.0,
            max_tokens: 12000,
            messages: [
              { role: "user", content: prompt },
            ],
          }),
        });

        if (!grokResponse.ok) {
          if (grokResponse.status === 429) {
            return new Response(JSON.stringify({ error: "Rate limit reached. Please wait and try again." }), {
              status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          const errorText = await grokResponse.text();
          console.error("Grok API error:", grokResponse.status, errorText);
          throw new Error("Premium analysis failed");
        }

        const grokData = await grokResponse.json();
        rawAnalysis = grokData.choices?.[0]?.message?.content || "";
        console.log("[sermon-sync] Phase 3a complete. Raw length:", rawAnalysis.length);

        if (detectRefusal(rawAnalysis)) {
          throw new Error("The AI could not analyze this sermon. Please try another sermon link.");
        }

        if (!hasTimeRange) {
          await supabase.from("sermon_transcripts").update({
            raw_ai_response: rawAnalysis,
          }).eq("video_id", videoId);
        }
      }

      // Phase 3b: Gemini extracts structured JSON
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

      console.log("[sermon-sync] Phase 3b: Calling Gemini for JSON extraction...");
      const geminiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          max_tokens: 8000,
          messages: [
            { role: "system", content: "You extract structured sermon data and return only valid JSON." },
            { role: "user", content: GEMINI_EXTRACTION_PROMPT(rawAnalysis) },
          ],
        }),
      });

      if (!geminiResponse.ok) {
        if (geminiResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit reached. Please wait and try again." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (geminiResponse.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Please contact support." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const errorText = await geminiResponse.text();
        console.error("Gemini extraction error:", geminiResponse.status, errorText);
        throw new Error("JSON extraction failed");
      }

      const geminiData = await geminiResponse.json();
      const geminiContent = geminiData.choices?.[0]?.message?.content || "";
      console.log("[sermon-sync] Phase 3b raw (first 200):", geminiContent.substring(0, 200));
      result = extractJson(geminiContent);

      if (isEmptyPremiumResult(result)) {
        console.log("[sermon-sync] Empty premium result — attempting fallback...");
        // Fallback to standard analysis
        const fallbackPrompt = usedTranscript
          ? STANDARD_PROMPT_TRANSCRIPT(transcriptForAI, chaptersInfo)
          : STANDARD_PROMPT_LEGACY(youtubeUrl, formatTimeRange(sermonStart, sermonEnd));

        const fallbackResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            max_tokens: 8000,
            messages: [
              { role: "system", content: "You are a Christian sermon analysis assistant. Return only valid JSON, no markdown fences." },
              { role: "user", content: fallbackPrompt },
            ],
          }),
        });
        if (fallbackResp.ok) {
          const fbData = await fallbackResp.json();
          const fbContent = fbData.choices?.[0]?.message?.content || "";
          const fbResult = extractJson(fbContent);
          result = {
            ...fbResult,
            mainScripture: (fbResult as Record<string, unknown>).mainScripture || null,
            overallMessage: (fbResult as Record<string, unknown>).sermonNotes || (fbResult as Record<string, unknown>).overallMessage || "",
            subtopics: (fbResult as Record<string, unknown>).subtopics || [],
            dailyPrayers: (fbResult as Record<string, unknown>).dailyPrayers || [],
          };
        }

        if (isEmptyPremiumResult(result) && !(result as Record<string, unknown>).sermonNotes) {
          throw new Error("Could not extract sermon details from this video. Please try a different sermon or adjust the time range.");
        }
      }
    } else {
      /* ─── Standard: Gemini analyzes transcript ─── */
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

      const prompt = usedTranscript
        ? STANDARD_PROMPT_TRANSCRIPT(transcriptForAI, chaptersInfo)
        : STANDARD_PROMPT_LEGACY(youtubeUrl, formatTimeRange(sermonStart, sermonEnd));

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          max_tokens: 8000,
          messages: [
            { role: "system", content: "You are a Christian sermon analysis assistant. Return only valid JSON, no markdown fences." },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit reached. Please wait and try again." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Please contact support." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const errorText = await response.text();
        console.error("AI gateway error:", response.status, errorText);
        throw new Error("AI processing failed");
      }

      const aiData = await response.json();
      const content = aiData.choices?.[0]?.message?.content || "";
      console.log("[sermon-sync] Gemini raw (first 200):", content.substring(0, 200));
      result = extractJson(content);
    }

    // Cache result
    const videoTitle = (result.sermonTitle as string) || (result.sermon_title as string) || null;
    await supabase.from("sermon_transcripts").update({
      [cacheField]: result,
      ...(videoTitle ? { video_title: videoTitle } : {}),
    }).eq("video_id", videoId);

    return new Response(JSON.stringify({
      ...result,
      mode: isPremium ? "premium" : "standard",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("sermon-sync error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
