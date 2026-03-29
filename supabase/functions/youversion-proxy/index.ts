import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Input validation ---
    const { endpoint } = await req.json();

    if (typeof endpoint !== "string" || !endpoint.startsWith("/")) {
      return new Response(
        JSON.stringify({ error: "Invalid endpoint. Must start with '/'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Whitelist: only allow /bibles/ paths
    if (!endpoint.startsWith("/bibles")) {
      return new Response(
        JSON.stringify({ error: "Only /bibles endpoints are permitted" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- Supabase client (service role for cache table) ---
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // --- DaaC: check cache ---
    const { data: cached } = await supabase
      .from("bible_cache")
      .select("payload")
      .eq("request_path", endpoint)
      .maybeSingle();

    if (cached) {
      return new Response(JSON.stringify(cached.payload), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "X-Cache": "HIT",
        },
      });
    }

    // --- Cache MISS: fetch from YouVersion ---
    const appKey = Deno.env.get("VITE_YOUVERSION_APP_KEY");
    if (!appKey) {
      return new Response(
        JSON.stringify({ error: "YouVersion API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const yvResponse = await fetch(`https://api.youversion.com/v1${endpoint}`, {
      headers: {
        "X-YouVersion-Developer-Token": appKey,
        Accept: "application/json",
      },
    });

    if (!yvResponse.ok) {
      const errorText = await yvResponse.text();
      return new Response(
        JSON.stringify({
          error: "YouVersion API error",
          status: yvResponse.status,
          detail: errorText,
        }),
        {
          status: yvResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const payload = await yvResponse.json();

    // --- Store in cache (fire-and-forget, don't block response) ---
    supabase
      .from("bible_cache")
      .upsert(
        { request_path: endpoint, payload },
        { onConflict: "request_path" },
      )
      .then(({ error }) => {
        if (error) console.error("Cache insert error:", error.message);
      });

    return new Response(JSON.stringify(payload), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "X-Cache": "MISS",
      },
    });
  } catch (err) {
    console.error("youversion-proxy error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
