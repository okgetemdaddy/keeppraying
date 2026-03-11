import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a warm, compassionate assistant for KeepPray.ing — a Christian prayer community.
When someone sends a message or prayer request through the contact form, respond with:
- Genuine warmth and care
- A brief, encouraging reply (2-4 sentences max)
- A relevant Bible verse where fitting
- If it's a prayer request, briefly pray with them
- Sign off as "The KeepPray.ing Team"
Keep your tone uplifting, biblically grounded, and concise.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "AI not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Resolve user from auth header if present
  const authHeader = req.headers.get("Authorization");
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    authHeader ? { global: { headers: { Authorization: authHeader } } } : undefined,
  );
  let userId: string | null = null;
  if (authHeader) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    userId = user?.id || null;
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { name, email, message } = await req.json();

    // Validate
    if (!message || typeof message !== "string" || message.trim().length < 2) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (message.length > 1000) {
      return new Response(JSON.stringify({ error: "Message too long" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanName = name ? String(name).trim().slice(0, 100) : null;
    const cleanEmail = email ? String(email).trim().slice(0, 255) : null;
    const cleanMessage = message.trim().slice(0, 1000);

    // Save to DB first
    const { data: submission, error: insertErr } = await supabase
      .from("contact_submissions")
      .insert({ name: cleanName, email: cleanEmail, message: cleanMessage })
      .select("id")
      .single();

    if (insertErr || !submission) {
      console.error("Insert error:", insertErr);
      return new Response(JSON.stringify({ error: "Failed to save message" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate AI reply
    const userContext = cleanName
      ? `${cleanName} wrote: "${cleanMessage}"`
      : `Someone wrote: "${cleanMessage}"`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContext },
        ],
        stream: false,
      }),
    });

    let aiReply = "Thank you for reaching out. We've received your message and will get back to you soon. God bless you! 🙏\n\n— The KeepPray.ing Team";

    if (aiResp.ok) {
      const aiData = await aiResp.json();
      aiReply = aiData.choices?.[0]?.message?.content || aiReply;
    } else {
      console.error("AI gateway error:", aiResp.status);
    }

    // Update submission with AI reply
    await supabase
      .from("contact_submissions")
      .update({ ai_reply: aiReply, replied_at: new Date().toISOString() })
      .eq("id", submission.id);

    return new Response(JSON.stringify({ success: true, ai_reply: aiReply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("contact-form error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
