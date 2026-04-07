import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { token, original_filename, file_size_bytes, encryption_iv, encryption_salt } =
      await req.json();

    if (!token || typeof token !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to bypass RLS for the burn operation
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Step 1: Validate the token exists, is unused, and not expired
    const { data: tokenRow, error: lookupErr } = await supabaseAdmin
      .from("upload_access_tokens")
      .select("id, used, expires_at")
      .eq("token", token)
      .single();

    if (lookupErr || !tokenRow) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired link" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (tokenRow.used) {
      return new Response(
        JSON.stringify({ error: "This link has already been used" }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (new Date(tokenRow.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "This link has expired" }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Burn the token atomically
    const { error: burnErr } = await supabaseAdmin
      .from("upload_access_tokens")
      .update({ used: true, used_at: new Date().toISOString() })
      .eq("id", tokenRow.id)
      .eq("used", false); // optimistic lock

    if (burnErr) {
      return new Response(
        JSON.stringify({ error: "Failed to validate link" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Generate a unique storage path
    const storagePath = `${tokenRow.id}/${Date.now()}.bin`;

    // Step 4: Create a signed upload URL (valid 10 minutes)
    const { data: signedUrl, error: signErr } = await supabaseAdmin.storage
      .from("secure_ingress")
      .createSignedUploadUrl(storagePath);

    if (signErr || !signedUrl) {
      return new Response(
        JSON.stringify({ error: "Failed to prepare upload destination" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 5: If metadata provided, insert the submission record
    if (original_filename) {
      await supabaseAdmin.from("admin_submissions").insert({
        token_id: tokenRow.id,
        original_filename,
        stored_path: storagePath,
        file_size_bytes: file_size_bytes || null,
        encryption_iv: encryption_iv || null,
        encryption_salt: encryption_salt || null,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        token_id: tokenRow.id,
        upload_url: signedUrl.signedUrl,
        upload_token: signedUrl.token,
        storage_path: storagePath,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
