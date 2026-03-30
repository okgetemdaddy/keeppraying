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

/* ─── Transcript helpers ─── */

/** Extract a direct audio URL from YouTube via cobalt.tools API */
async function getAudioUrl(youtubeUrl: string): Promise<string> {
  console.log("[sermon-sync] Phase 1: Extracting audio URL via cobalt...");

  // Ranked by score from instances.cobalt.best — top instances first
  const cobaltInstances = [
    "https://cobalt-api.meowing.de",      // 96%
    "https://cobalt-backend.canine.tools", // 80%
    "https://kityune.imput.net",           // 76% (official)
    "https://nachos.imput.net",            // 76% (official)
    "https://sunny.imput.net",             // 76% (official)
    "https://blossom.imput.net",           // 76% (official)
    "https://capi.3kh0.net",              // 72%
  ];

  let lastError = "";
  for (const baseUrl of cobaltInstances) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      const resp = await fetch(`${baseUrl}/`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: youtubeUrl,
          downloadMode: "audio",
          audioFormat: "mp3",
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!resp.ok) {
        const body = await resp.text().catch(() => "");
        lastError = `cobalt ${baseUrl} returned ${resp.status}: ${body.substring(0, 120)}`;
        console.warn(`[sermon-sync] ${lastError}`);
        continue;
      }

      const data = await resp.json();
      if (data.url) {
        console.log(`[sermon-sync] Got audio URL from cobalt (${baseUrl})`);
        return data.url;
      }
      if (data.status === "tunnel" || data.status === "redirect") {
        console.log(`[sermon-sync] Got tunnel/redirect URL from cobalt (${baseUrl})`);
        return data.url;
      }
      lastError = `cobalt ${baseUrl} unexpected response: ${JSON.stringify(data).substring(0, 200)}`;
      console.warn(`[sermon-sync] ${lastError}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("aborted")) {
        lastError = `cobalt ${baseUrl} timed out (10s)`;
      } else {
        lastError = `cobalt ${baseUrl} error: ${msg}`;
      }
      console.warn(`[sermon-sync] ${lastError}`);
    }
  }

  throw new Error(`Could not extract audio from YouTube. ${lastError}`);
}

/** Submit audio to AssemblyAI and poll until complete */
async function transcribeWithAssemblyAI(audioUrl: string): Promise<{
  full_text: string;
  chapters: Array<{ start: number; end: number; gist: string; headline: string; summary: string }>;
  utterances: Array<{ speaker: string; text: string; start: number; end: number }>;
  words: Array<{ text: string; start: number; end: number; speaker: string | null }>;
}> {
  const ASSEMBLY_KEY = Deno.env.get("Assembly_Ai");
  if (!ASSEMBLY_KEY) throw new Error("AssemblyAI API key not configured");

  console.log("[sermon-sync] Phase 2: Submitting to AssemblyAI...");

  // Submit transcription job
  const submitResp = await fetch("https://api.assemblyai.com/v2/transcript", {
    method: "POST",
    headers: {
      "Authorization": ASSEMBLY_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      audio_url: audioUrl,
      auto_chapters: true,
      speaker_labels: true,
      language_detection: true,
    }),
  });

  if (!submitResp.ok) {
    const errText = await submitResp.text();
    console.error("[sermon-sync] AssemblyAI submit error:", submitResp.status, errText);
    throw new Error("Transcription service error. Please try again.");
  }

  const submitData = await submitResp.json();
  const transcriptId = submitData.id;
  console.log("[sermon-sync] AssemblyAI job submitted:", transcriptId);

  // Poll for completion (max ~8 minutes with 10s intervals)
  const maxPolls = 48;
  const pollInterval = 10_000;

  for (let i = 0; i < maxPolls; i++) {
    await new Promise((r) => setTimeout(r, pollInterval));

    const pollResp = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
      headers: { "Authorization": ASSEMBLY_KEY },
    });

    if (!pollResp.ok) {
      console.warn("[sermon-sync] Poll error:", pollResp.status);
      continue;
    }

    const pollData = await pollResp.json();
    console.log(`[sermon-sync] Poll ${i + 1}/${maxPolls}: status=${pollData.status}`);

    if (pollData.status === "completed") {
      console.log("[sermon-sync] Transcription complete. Text length:", pollData.text?.length);
      return {
        full_text: pollData.text || "",
        chapters: pollData.chapters || [],
        utterances: pollData.utterances || [],
        words: pollData.words || [],
      };
    }

    if (pollData.status === "error") {
      console.error("[sermon-sync] AssemblyAI error:", pollData.error);
      throw new Error("Transcription failed: " + (pollData.error || "Unknown error"));
    }
  }

  throw new Error("Transcription timed out. The sermon may be too long. Please try again.");
}

/** Extract transcript within a time range using word-level timestamps */
function extractTimeRange(
  words: Array<{ text: string; start: number; end: number }>,
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

  const filtered = words
    .filter((w) => w.start >= startMs && w.end <= endMs)
    .map((w) => w.text);

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

    /* ─── Phase 1 & 2: Get transcript (from cache or fresh) ─── */
    let fullText = typeof existingRow?.full_text === "string" && existingRow.full_text.length > 100
      ? existingRow.full_text : null;
    let rawSegments = existingRow?.raw_segments as {
      chapters?: Array<{ start: number; end: number; gist: string; headline: string; summary: string }>;
      utterances?: Array<{ speaker: string; text: string; start: number; end: number }>;
      words?: Array<{ text: string; start: number; end: number; speaker?: string | null }>;
    } | null;

    let usedTranscript = false;

    if (!fullText) {
      // Try to get a real transcript via cobalt + AssemblyAI
      try {
        const audioUrl = await getAudioUrl(youtubeUrl);
        const transcription = await transcribeWithAssemblyAI(audioUrl);

        fullText = transcription.full_text;
        rawSegments = {
          chapters: transcription.chapters,
          utterances: transcription.utterances,
          words: transcription.words,
        };

        // Cache transcript
        await supabase.from("sermon_transcripts").update({
          full_text: fullText,
          raw_segments: rawSegments as unknown as Record<string, unknown>,
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

    // If time range specified and we have word-level timestamps, extract just that range
    if (hasTimeRange && usedTranscript && rawSegments?.words) {
      const rangeText = extractTimeRange(
        rawSegments.words as Array<{ text: string; start: number; end: number }>,
        sermonStart,
        sermonEnd
      );
      if (rangeText.length > 50) {
        transcriptForAI = rangeText;
        console.log("[sermon-sync] Using time-range filtered transcript. Length:", rangeText.length);
      }
    }

    // Truncate very long transcripts to avoid token limits (~40k words ≈ ~50k tokens)
    if (transcriptForAI.length > 160_000) {
      transcriptForAI = transcriptForAI.substring(0, 160_000) + "\n\n[Transcript truncated for length]";
    }

    // Format chapters info for context
    let chaptersInfo = "";
    if (rawSegments?.chapters && rawSegments.chapters.length > 0) {
      chaptersInfo = rawSegments.chapters.map((ch) => {
        const startMin = Math.floor(ch.start / 1000 / 60);
        const startSec = Math.floor((ch.start / 1000) % 60);
        return `[${startMin}:${String(startSec).padStart(2, "0")}] ${ch.headline} — ${ch.summary}`;
      }).join("\n");
    }

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
