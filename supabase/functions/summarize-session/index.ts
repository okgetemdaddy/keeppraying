// TODO: Abstract AI provider into a pluggable interface — swap Grok for Claude or other models without touching the client
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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
}

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

    // Try AI summarization
    const grokKey = Deno.env.get("GROK_API_KEY");
    let summary: SessionSummary;

    if (grokKey && eventLog.length > 0) {
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
          // Strip potential markdown fences
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
