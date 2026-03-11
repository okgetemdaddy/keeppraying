import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase credentials not configured");

    // Verify admin auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch last 100 chat logs
    const { data: logs, error } = await supabase
      .from("ai_chat_logs")
      .select("user_message, ai_response, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    if (!logs || logs.length === 0) {
      return new Response(JSON.stringify({ error: "No chat logs found to analyze." }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const logSummary = logs.map((l, i) => `Q${i + 1}: ${l.user_message}`).join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an analyst for KeepPray.ing, a Christian prayer app. Analyze user questions from PrayerAssist and generate a weekly FAQ report in Markdown format.

The report should include:
1. **Top 5 Most Frequently Asked Topics** (with count estimate)
2. **Most Common Prayer Requests** (themes)
3. **Scripture Questions** (most cited verses/books)
4. **Spiritual Growth Topics** (discipleship, faith challenges)
5. **Recommendations** for new content or features

Format as beautiful Markdown with headers, bullet points, and insights. Be pastoral and insightful.`
          },
          {
            role: "user",
            content: `Analyze these ${logs.length} user questions from the past week and generate a FAQ report:\n\n${logSummary}`
          }
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const reportContent = data.choices?.[0]?.message?.content || "";

    // Store in admin_reports
    const { data: report, error: insertError } = await supabase
      .from("admin_reports")
      .insert({
        title: `Weekly FAQ Report — ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
        content: reportContent,
        report_type: 'faq',
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ report }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("faq-report error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
