import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { circleId } = await req.json();
    if (!circleId) {
      return new Response(JSON.stringify({ error: "circleId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch circle info
    const { data: circle } = await supabase
      .from("accountability_circles")
      .select("name, ai_encouragement")
      .eq("id", circleId)
      .single();

    if (!circle || !circle.ai_encouragement) {
      return new Response(JSON.stringify({ error: "Circle not found or AI encouragement disabled" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch members with profiles
    const { data: members } = await supabase
      .from("accountability_circle_members")
      .select("user_id")
      .eq("circle_id", circleId);

    const memberCount = members?.length || 0;

    // Fetch aggregate stats
    const userIds = members?.map((m: any) => m.user_id) || [];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("full_name, current_streak")
      .in("id", userIds);

    const names = profiles?.map((p: any) => p.full_name || "a friend") || [];
    const streaks = profiles?.map((p: any) => p.current_streak || 0) || [];
    const avgStreak = streaks.length ? Math.round(streaks.reduce((a: number, b: number) => a + b, 0) / streaks.length) : 0;

    // Fetch recent shared prayers count
    const { count: prayerCount } = await supabase
      .from("accountability_circle_prayers")
      .select("id", { count: "exact", head: true })
      .eq("circle_id", circleId);

    const prompt = `You are a gentle, encouraging Christian companion. Write a brief, warm, positive-only encouragement message for a small accountability circle called "${circle.name}" with ${memberCount} members.

Context (use to personalize, but keep it uplifting):
- The group has shared ${prayerCount || 0} prayers together
- Average prayer streak: ${avgStreak} days
- Member first names: ${names.join(", ")}

Rules:
- ONLY positive, uplifting content. No guilt, no shame, no pressure.
- Include one relevant Scripture verse.
- Keep it brief (2-4 sentences + verse).
- Write as if you're a trusted friend cheering them on.
- Celebrate what they're doing, not what they're missing.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "You are a warm, positive Christian encourager. Only output the encouragement text, nothing else." },
          { role: "user", content: prompt },
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      if (response.status === 429 || response.status === 402) {
        return new Response(JSON.stringify({ error: "AI temporarily unavailable. Try again later." }), {
          status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content?.trim() || "";

    if (!content) throw new Error("Empty AI response");

    // Save to DB (service role bypasses RLS)
    const { error: insertErr } = await supabase
      .from("accountability_encouragements")
      .insert({ circle_id: circleId, content });

    if (insertErr) console.error("Insert error:", insertErr);

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("circle-encouragement error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
