import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    const today = new Date().toISOString().slice(0, 10);

    // Check cache
    const { data: cached } = await supabase
      .from("daily_welcome_messages")
      .select("message")
      .eq("user_id", user.id)
      .eq("active_date", today)
      .maybeSingle();

    if (cached?.message) {
      return new Response(JSON.stringify({ message: cached.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's first name
    const firstName =
      user.user_metadata?.full_name?.split(" ")[0] || "friend";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content:
              "You write short, warm, edifying daily greetings for a Christian prayer app. Keep it to 1-2 sentences max. Be encouraging, scripturally inspired (but don't always quote a verse), and personal. Use the user's first name naturally. No emojis. No hashtags.",
          },
          {
            role: "user",
            content: `Write a brief daily welcome message for ${firstName} who is opening their prayer station today (${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}). Keep it warm and brief.`,
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, errText);
      // Fallback message
      const fallback = `Welcome back, ${firstName}. The Lord is near to all who call on Him.`;
      return new Response(JSON.stringify({ message: fallback }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const message =
      aiData.choices?.[0]?.message?.content?.trim() ||
      `Welcome back, ${firstName}. The Lord is near to all who call on Him.`;

    // Cache it
    await supabase
      .from("daily_welcome_messages")
      .insert({ user_id: user.id, message, active_date: today });

    return new Response(JSON.stringify({ message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("daily-welcome error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
