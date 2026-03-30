import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const GROK_API_KEY = Deno.env.get("GROK_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!GROK_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Server not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const anonClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") || "");
      const { data: { user } } = await anonClient.auth.getUser(token);
      if (user) {
        const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
        if (profile?.role !== "admin") {
          return new Response(JSON.stringify({ error: "Admin access required" }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // Fetch all existing verse summaries
    const { data: verses, error } = await db
      .from("verse_summaries")
      .select("id, reference, verse_text, summary, exegesis");

    if (error) throw error;
    if (!verses || verses.length === 0) {
      return new Response(JSON.stringify({ message: "No cached summaries to refresh.", refreshed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let refreshed = 0;
    let failed = 0;
    const results: { reference: string; status: string }[] = [];

    for (const verse of verses) {
      try {
        // Regenerate summary
        const summaryPrompt = verse.verse_text
          ? `Give a concise, plain-English summary (2-3 sentences) of ${verse.reference}: "${verse.verse_text}". Be warm, simple, and encouraging.`
          : `Give a concise, plain-English summary (2-3 sentences) of the Bible verse ${verse.reference}. Be warm, simple, and encouraging.`;

        const summaryResp = await fetch("https://api.x.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GROK_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "grok-4.20-0309-reasoning",
            messages: [
              { role: "system", content: "You are a friendly Bible scholar for KeepPray.ing. Give brief, warm, plain-English summaries of Bible verses. Always 2-3 sentences max. No jargon." },
              { role: "user", content: summaryPrompt },
            ],
          }),
        });

        if (!summaryResp.ok) {
          console.error(`Grok error for ${verse.reference}:`, summaryResp.status);
          results.push({ reference: verse.reference, status: "failed" });
          failed++;
          // Brief delay before continuing
          await new Promise(r => setTimeout(r, 500));
          continue;
        }

        const summaryData = await summaryResp.json();
        const newSummary = summaryData.choices?.[0]?.message?.content || verse.summary;

        // Update in DB
        const updateData: Record<string, string> = { summary: newSummary };

        // If exegesis existed, regenerate that too
        if (verse.exegesis) {
          await new Promise(r => setTimeout(r, 300)); // rate-limit pause

          const exegesisPrompt = `Please give an in-depth biblical exegesis of ${verse.reference}${verse.verse_text ? `: "${verse.verse_text}"` : ""}. Explain its historical context, Greek/Hebrew meaning, theological significance, and practical application for today.`;

          const exegesisResp = await fetch("https://api.x.ai/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${GROK_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "grok-4.20-reasoning",
              messages: [
                { role: "system", content: "You are a biblical scholar for KeepPray.ing. Give thorough exegesis with historical context, original language insights, theological depth, and practical application." },
                { role: "user", content: exegesisPrompt },
              ],
            }),
          });

          if (exegesisResp.ok) {
            const exData = await exegesisResp.json();
            updateData.exegesis = exData.choices?.[0]?.message?.content || verse.exegesis;
          }
        }

        await db.from("verse_summaries").update(updateData).eq("id", verse.id);
        results.push({ reference: verse.reference, status: "refreshed" });
        refreshed++;

        // Rate-limit pause between verses
        await new Promise(r => setTimeout(r, 500));
      } catch (err) {
        console.error(`Error refreshing ${verse.reference}:`, err);
        results.push({ reference: verse.reference, status: "error" });
        failed++;
      }
    }

    return new Response(JSON.stringify({
      message: `Refreshed ${refreshed} of ${verses.length} verse summaries using Grok.`,
      refreshed,
      failed,
      total: verses.length,
      results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("refresh-verse-summaries error:", e);
    return new Response(JSON.stringify({ error: "Failed to refresh summaries" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
