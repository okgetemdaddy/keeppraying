import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are PrayerWatch, an AI monitor for KeepPray.ing — a Christian prayer community site.
Your role is to analyze provided site statistics and data to surface trends, anomalies, and improvements.

Guidelines:
- Be encouraging, faith-aligned, and biblically inspired in tone
- Suggest improvements that strengthen community and prayer life
- Flag anomalies clearly but constructively
- Quote relevant Bible verses where fitting
- Output MUST be valid JSON matching the schema exactly

Output schema:
{
  "summary": "string — 2-3 sentence high-level summary",
  "key_insights": ["string", ...],
  "anomalies": ["string", ...],
  "suggestions": ["string", ...],
  "health_score": number (0-100),
  "verse": "string — one relevant Bible verse with reference"
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { action = "generate", query = "" } = body;

    // ── Aggregate stats from DB ──────────────────────────────────────
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const [
      { count: totalUsers },
      { count: newUsersWeek },
      { count: newUsersPrevWeek },
      { count: totalPrayers },
      { count: approvedPrayers },
      { count: pendingPrayers },
      { count: rejectedPrayers },
      { count: prayersThisWeek },
      { count: prayersPrevWeek },
      { data: topTags },
      { count: totalLikes },
      { count: likesThisWeek },
      { count: totalPrayed },
      { count: prayedThisWeek },
      { count: chatLogs },
      { count: chatLogsWeek },
      { count: totalContacts },
      { data: recentLogs },
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
      supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", fourteenDaysAgo).lt("created_at", sevenDaysAgo),
      supabase.from("prayer_cards").select("*", { count: "exact", head: true }),
      supabase.from("prayer_cards").select("*", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("prayer_cards").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("prayer_cards").select("*", { count: "exact", head: true }).eq("status", "rejected"),
      supabase.from("prayer_cards").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
      supabase.from("prayer_cards").select("*", { count: "exact", head: true }).gte("created_at", fourteenDaysAgo).lt("created_at", sevenDaysAgo),
      supabase.from("prayer_cards").select("tags").eq("status", "approved").not("tags", "is", null),
      supabase.from("likes").select("*", { count: "exact", head: true }),
      supabase.from("likes").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
      supabase.from("prayed_actions").select("*", { count: "exact", head: true }),
      supabase.from("prayed_actions").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
      supabase.from("ai_chat_logs").select("*", { count: "exact", head: true }),
      supabase.from("ai_chat_logs").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
      supabase.from("contact_submissions").select("*", { count: "exact", head: true }),
      supabase.from("site_logs").select("type,message,created_at").order("created_at", { ascending: false }).limit(20),
    ]);

    // Tag frequency
    const tagFreq: Record<string, number> = {};
    (topTags || []).forEach((row: { tags: string[] | null }) => {
      (row.tags || []).forEach((t: string) => { tagFreq[t] = (tagFreq[t] || 0) + 1; });
    });
    const topTagList = Object.entries(tagFreq).sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([tag, count]) => `${tag} (${count})`);

    // Week-over-week growth
    const userGrowthPct = newUsersPrevWeek ? Math.round(((newUsersWeek! - newUsersPrevWeek!) / newUsersPrevWeek!) * 100) : null;
    const prayerGrowthPct = prayersPrevWeek ? Math.round(((prayersThisWeek! - prayersPrevWeek!) / prayersPrevWeek!) * 100) : null;
    const rejectionRate = totalPrayers ? Math.round(((rejectedPrayers || 0) / totalPrayers) * 100) : 0;

    const stats = {
      users: { total: totalUsers, new_this_week: newUsersWeek, new_prev_week: newUsersPrevWeek, growth_pct: userGrowthPct },
      prayers: {
        total: totalPrayers, approved: approvedPrayers, pending: pendingPrayers,
        rejected: rejectedPrayers, this_week: prayersThisWeek, prev_week: prayersPrevWeek,
        growth_pct: prayerGrowthPct, rejection_rate_pct: rejectionRate,
      },
      engagement: { total_likes: totalLikes, likes_this_week: likesThisWeek, total_prayed: totalPrayed, prayed_this_week: prayedThisWeek },
      ai: { total_chat_logs: chatLogs, chat_logs_this_week: chatLogsWeek },
      contacts: { total: totalContacts },
      top_tags: topTagList,
      recent_site_logs: (recentLogs || []).slice(0, 5),
      generated_at: now.toISOString(),
    };

    // ── Natural language query mode ──────────────────────────────────
    if (action === "query" && query) {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `Current site stats: ${JSON.stringify(stats, null, 2)}\n\nAdmin question: ${query}\n\nAnswer directly and concisely as PrayerWatch. No JSON needed — just a helpful, encouraging response.` },
          ],
          stream: false,
        }),
      });

      if (!resp.ok) {
        const t = await resp.text();
        if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limit reached. Please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (resp.status === 402) return new Response(JSON.stringify({ error: "Usage credits needed. Please add credits to your workspace." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        throw new Error(`AI gateway error ${resp.status}: ${t}`);
      }

      const aiData = await resp.json();
      const answer = aiData.choices?.[0]?.message?.content || "Unable to generate answer.";
      return new Response(JSON.stringify({ answer, stats }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Full report generation ───────────────────────────────────────
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Analyze this site data and return ONLY valid JSON:\n${JSON.stringify(stats, null, 2)}` },
        ],
        stream: false,
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limit reached. Please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (resp.status === 402) return new Response(JSON.stringify({ error: "Usage credits needed. Please add credits to your workspace." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error ${resp.status}: ${t}`);
    }

    const aiData = await resp.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "{}";
    let analysis: Record<string, unknown> = {};
    try { analysis = JSON.parse(rawContent); } catch { analysis = { summary: rawContent, key_insights: [], anomalies: [], suggestions: [], health_score: 50 }; }

    // Store report
    const { data: report, error: insertErr } = await supabase.from("ai_monitor_reports").insert({
      report_type: body.triggered_by === "cron" ? "weekly" : "manual",
      report_content: { ...analysis, raw_stats: stats },
      summary: analysis.summary as string || "",
      suggestions: (analysis.suggestions as string[]) || [],
      anomalies: (analysis.anomalies as string[]) || [],
      key_metrics: stats as unknown as Record<string, unknown>,
      triggered_by: body.triggered_by || "manual",
    }).select().single();

    if (insertErr) console.error("Insert report error:", insertErr);

    return new Response(JSON.stringify({ report, analysis, stats }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-monitor error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
