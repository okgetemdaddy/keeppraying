// Deploy: npx supabase functions deploy summarize-session --no-verify-jwt
// Set secrets: GROK_API_KEY + LOVABLE_API_KEY (auto-provisioned)
// Architecture: 3-model parallel fan-out (Gemini Pro, GPT-5 Nano, GPT-5 Mini)
//   → Grok 4 synthesis → final SessionSummary
// TODO: Abstract AI provider into a pluggable interface — swap models without touching the client
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SessionSummary {
  thematic_summary: string;
  key_insights: string[];
  study_arc: string;
  tags: string[];
  time_breakdown: {
    reading_pct: number;
    annotating_pct: number;
    cross_referencing_pct: number;
  };
  verse_focus: string[];
  model_contributions?: {
    theological: string;
    statistical: string;
    behavioral: string;
  } | null;
  _raw_analyses?: Record<string, unknown> | null;
}

/* ── Shared response format for fan-out models ── */
const LENS_RESPONSE_FORMAT = `Respond ONLY with valid JSON (no markdown, no backticks):
{
  "analysis": "Your analytical perspective in 2-3 sentences",
  "key_findings": ["finding 1", "finding 2", "finding 3"],
  "suggested_tags": ["tag1", "tag2"],
  "verse_focus": ["verse references that received most attention"],
  "confidence": 0.0 to 1.0
}`;

/* ── Fan-out model callers ── */

const LOVABLE_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function callLovableModel(
  apiKey: string,
  model: string,
  systemPrompt: string,
  payload: string,
): Promise<Record<string, unknown> | null> {
  const res = await fetch(LOVABLE_GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: payload },
      ],
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    console.error(`${model} returned ${res.status}: ${await res.text()}`);
    return null;
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "{}";
  return JSON.parse(text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
}

async function callGeminiPro(apiKey: string, payload: string) {
  return callLovableModel(
    apiKey,
    "google/gemini-2.5-pro",
    `You are a biblical theology expert analyzing a Bible study session. Focus on theological themes, doctrinal connections, and how the user's annotations reveal their hermeneutical approach.\n\n${LENS_RESPONSE_FORMAT}`,
    payload,
  );
}

async function callGpt5Nano(apiKey: string, payload: string) {
  return callLovableModel(
    apiKey,
    "openai/gpt-5-nano",
    `You are a data analyst. Extract statistical patterns from Bible study telemetry. Focus on time distribution, interaction frequency, reading velocity, and annotation density. Be precise with numbers.\n\n${LENS_RESPONSE_FORMAT}`,
    payload,
  );
}

async function callGpt5Mini(apiKey: string, payload: string) {
  return callLovableModel(
    apiKey,
    "openai/gpt-5-mini",
    `You are a learning behavior analyst. Analyze this Bible study session to identify study patterns, engagement shifts, and learning progression. Notice when the user paused, when they intensified annotations, and what triggered cross-references.\n\n${LENS_RESPONSE_FORMAT}`,
    payload,
  );
}

/* ── Main handler ── */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify JWT
    const anonClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await anonClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { session_id } = await req.json();
    if (!session_id) {
      return new Response(JSON.stringify({ error: "session_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify ownership
    const { data: session, error: sessionErr } = await supabase
      .from("study_sessions")
      .select("*")
      .eq("id", session_id)
      .eq("user_id", user.id)
      .single();

    if (sessionErr || !session) {
      return new Response(
        JSON.stringify({ error: "Session not found or unauthorized" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Fetch events
    const { data: events } = await supabase
      .from("session_events")
      .select("*")
      .eq("session_id", session_id)
      .order("created_at", { ascending: true });

    const eventLog = events ?? [];

    // Build fallback stats
    const eventCounts: Record<string, number> = {};
    for (const e of eventLog) {
      eventCounts[e.event_type] = (eventCounts[e.event_type] || 0) + 1;
    }

    const verseRange = session.verse_start && session.verse_end
      ? `${session.book_usfm} ${session.chapter_id}:${session.verse_start}–${session.verse_end}`
      : `${session.book_usfm} ${session.chapter_id}`;

    // ── Multi-model fan-out ──
    const grokKey = Deno.env.get("GROK_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    let summary: SessionSummary;

    if (lovableKey && grokKey && eventLog.length > 0) {
      try {
        const sessionPayload = JSON.stringify({
          sessionContext: {
            book: session.book_usfm,
            chapter: session.chapter_id,
            verse_start: session.verse_start,
            verse_end: session.verse_end,
            duration_seconds: session.elapsed_seconds,
            session_type: session.session_type || "canvas",
            passage: verseRange,
          },
          events: eventLog.map((e: any) => ({
            type: e.event_type,
            payload: e.payload,
            time: e.created_at,
          })),
        });

        // ── Fan-out: 3 models in parallel ──
        const [geminiResult, nanoResult, miniResult] = await Promise.allSettled([
          callGeminiPro(lovableKey, sessionPayload),
          callGpt5Nano(lovableKey, sessionPayload),
          callGpt5Mini(lovableKey, sessionPayload),
        ]);

        const analyses = {
          theological: geminiResult.status === "fulfilled" ? geminiResult.value : null,
          statistical: nanoResult.status === "fulfilled" ? nanoResult.value : null,
          behavioral: miniResult.status === "fulfilled" ? miniResult.value : null,
        };

        console.log(
          "Fan-out results:",
          Object.entries(analyses)
            .map(([k, v]) => `${k}: ${v ? "✓" : "✗"}`)
            .join(", "),
        );

        // ── Synthesis: Grok 4 compiles all perspectives ──
        const synthesisPrompt = `You are the chief analyst for KeepRead.ing, a premium Bible study application.

Three specialist AI models have independently analyzed the same Bible study session. Synthesize their perspectives into one authoritative, enriched summary. Resolve contradictions by weighing each model's expertise area.

THEOLOGICAL ANALYSIS (Gemini 2.5 Pro — doctrine and hermeneutics):
${JSON.stringify(analyses.theological || "Model unavailable")}

STATISTICAL ANALYSIS (GPT-5 Nano — metrics and time distribution):
${JSON.stringify(analyses.statistical || "Model unavailable")}

BEHAVIORAL ANALYSIS (GPT-5 Mini — study patterns and engagement):
${JSON.stringify(analyses.behavioral || "Model unavailable")}

RAW SESSION DATA (for fact-checking):
Passage: ${verseRange}
Duration: ${session.elapsed_seconds} seconds
Events: ${eventLog.length}

Produce the FINAL synthesized summary. Respond ONLY with valid JSON (no markdown, no backticks):
{
  "thematic_summary": "3-4 sentence narrative weaving theological depth, statistical precision, and behavioral insight",
  "key_insights": ["insight 1", "insight 2", "insight 3", "insight 4"],
  "study_arc": "One compelling sentence describing the trajectory of this study session",
  "tags": ["tag1", "tag2", "tag3", "tag4"],
  "time_breakdown": { "reading_pct": 0, "annotating_pct": 0, "cross_referencing_pct": 0 },
  "verse_focus": ["the 2-3 verses with deepest engagement"],
  "model_contributions": {
    "theological": "1-sentence summary of what the theological lens revealed",
    "statistical": "1-sentence summary of what the statistical lens revealed",
    "behavioral": "1-sentence summary of what the behavioral lens revealed"
  }
}`;

        let finalSummary: SessionSummary | null = null;

        try {
          const grokRes = await fetch("https://api.x.ai/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${grokKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "grok-4-0709",
              messages: [{ role: "user", content: synthesisPrompt }],
              temperature: 0.3,
            }),
          });

          if (grokRes.ok) {
            const grokData = await grokRes.json();
            const rawText = grokData.choices?.[0]?.message?.content ?? "";
            const cleaned = rawText
              .replace(/```json\n?/g, "")
              .replace(/```\n?/g, "")
              .trim();
            finalSummary = JSON.parse(cleaned);
          } else {
            console.error(`Grok synthesis returned ${grokRes.status}`);
          }
        } catch (synthErr) {
          console.error("Synthesis failed, using best available analysis:", synthErr);
        }

        if (finalSummary) {
          // Attach raw analyses for the UI's expandable "compare perspectives" view
          finalSummary._raw_analyses = analyses;
          summary = finalSummary;
        } else {
          // Fallback: use the best individual analysis that succeeded
          const best = analyses.theological || analyses.behavioral || analyses.statistical;
          summary = {
            thematic_summary: (best as any)?.analysis || `Study session on ${verseRange}. ${eventLog.length} events recorded.`,
            key_insights: (best as any)?.key_findings || [],
            study_arc: "Individual model analysis — synthesis pending",
            tags: (best as any)?.suggested_tags || [],
            time_breakdown: { reading_pct: 70, annotating_pct: 20, cross_referencing_pct: 10 },
            verse_focus: (best as any)?.verse_focus || [],
            model_contributions: null,
            _raw_analyses: analyses,
          };
        }
      } catch (fanOutErr) {
        console.error("Multi-model fan-out failed entirely, using fallback:", fanOutErr);
        summary = buildFallbackSummary(session, eventCounts, verseRange);
      }
    } else if (grokKey && eventLog.length > 0) {
      // Legacy single-model path when LOVABLE_API_KEY is unavailable
      try {
        const prompt = `You are an analytical Bible study advisor. Analyze this chronological study session event log and return a structured JSON summary.

Session Context:
- Passage: ${verseRange}
- Duration: ${session.elapsed_seconds} seconds
- Session type: ${session.session_type || "canvas"}
- Total events: ${eventLog.length}

Event Log (chronological):
${JSON.stringify(
          eventLog.map((e: any) => ({
            type: e.event_type,
            payload: e.payload,
            time: e.created_at,
          })),
          null,
          2,
        )}

Return ONLY valid JSON matching this exact structure (no markdown, no code fences):
{
  "thematic_summary": "3-4 sentence narrative of the study's progression",
  "key_insights": ["insight1", "insight2"],
  "study_arc": "one-line trajectory description",
  "tags": ["tag1", "tag2"],
  "time_breakdown": {
    "reading_pct": 50,
    "annotating_pct": 30,
    "cross_referencing_pct": 20
  },
  "verse_focus": ["verse ref 1", "verse ref 2"]
}`;

        const aiRes = await fetch("https://api.x.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${grokKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "grok-4-0709",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.4,
          }),
        });

        if (aiRes.ok) {
          const aiData = await aiRes.json();
          const content = aiData.choices?.[0]?.message?.content ?? "";
          const cleaned = content
            .replace(/```json\n?/g, "")
            .replace(/```\n?/g, "")
            .trim();
          summary = JSON.parse(cleaned);
        } else {
          throw new Error(`Grok API ${aiRes.status}`);
        }
      } catch (aiErr) {
        console.error("AI summarization failed, using fallback:", aiErr);
        summary = buildFallbackSummary(session, eventCounts, verseRange);
      }
    } else {
      summary = buildFallbackSummary(session, eventCounts, verseRange);
    }

    // Write summary to study_sessions
    await supabase
      .from("study_sessions")
      .update({ session_summary: summary })
      .eq("id", session_id);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("summarize-session error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/* ── Fallback summary from raw stats ── */

function buildFallbackSummary(
  session: any,
  eventCounts: Record<string, number>,
  verseRange: string,
): SessionSummary {
  const total = Object.values(eventCounts).reduce(
    (a, b) => a + (b as number),
    0,
  );
  const readEvents =
    (eventCounts["verse_view"] || 0) + (eventCounts["chapter_nav"] || 0);
  const annotateEvents =
    (eventCounts["highlight_added"] || 0) +
    (eventCounts["note_written"] || 0) +
    (eventCounts["note_edited"] || 0) +
    (eventCounts["ink_stroke"] || 0) +
    (eventCounts["bookmark_added"] || 0);
  const crossRefEvents =
    (eventCounts["cross_ref_nav"] || 0) +
    (eventCounts["circle_select"] || 0);

  const readPct = total > 0 ? Math.round((readEvents / total) * 100) : 34;
  const annotatePct =
    total > 0 ? Math.round((annotateEvents / total) * 100) : 33;
  const crossPct = total > 0 ? 100 - readPct - annotatePct : 33;

  const mins = Math.round(session.elapsed_seconds / 60);

  return {
    thematic_summary: `Study session covering ${verseRange} lasting ${mins} minute${mins !== 1 ? "s" : ""}. ${total} interactions were recorded across ${Object.keys(eventCounts).length} activity types. This summary was generated from raw statistics.`,
    key_insights: Object.entries(eventCounts).map(
      ([k, v]) => `${v} ${k.replace(/_/g, " ")} event${(v as number) > 1 ? "s" : ""}`,
    ),
    study_arc: `${verseRange} — ${mins}min study with ${total} interactions`,
    tags: [session.book_usfm, session.session_type || "study"],
    time_breakdown: {
      reading_pct: readPct,
      annotating_pct: annotatePct,
      cross_referencing_pct: Math.max(0, crossPct),
    },
    verse_focus: [verseRange],
  };
}
