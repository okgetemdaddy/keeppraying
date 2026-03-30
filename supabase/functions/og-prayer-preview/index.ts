import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  const siteOrigin = "https://keeppraying.lovable.app";
  const fallbackRedirect = siteOrigin;

  if (!token) {
    return Response.redirect(fallbackRedirect, 302);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // Fetch share
    const { data: share } = await supabase
      .from("prayer_shares")
      .select("id, prayer_id, sender_id, expires_at, message")
      .eq("token", token)
      .maybeSingle();

    if (!share || new Date(share.expires_at) < new Date()) {
      return Response.redirect(fallbackRedirect, 302);
    }

    // Fetch prayer + sender in parallel
    const [prayerRes, senderRes] = await Promise.all([
      supabase
        .from("prayer_cards")
        .select("title, prayer_text, background_url")
        .eq("id", share.prayer_id)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", share.sender_id)
        .maybeSingle(),
    ]);

    const prayer = prayerRes.data;
    const sender = senderRes.data;

    const senderName = sender?.full_name?.split(" ")[0] || "Someone";
    const ogTitle = `${senderName} shared a prayer with you`;
    const ogDescription =
      "A prayer shared with love on KeepPray.ing — your sacred digital prayer closet.";
    const ogImage =
      prayer?.background_url ||
      `${siteOrigin}/placeholder.svg`;
    const canonicalUrl = `${siteOrigin}/shared-prayer/${token}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(ogTitle)} — KeepPray.ing</title>

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escapeAttr(ogTitle)}" />
  <meta property="og:description" content="${escapeAttr(ogDescription)}" />
  <meta property="og:image" content="${escapeAttr(ogImage)}" />
  <meta property="og:url" content="${escapeAttr(canonicalUrl)}" />
  <meta property="og:site_name" content="KeepPray.ing" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeAttr(ogTitle)}" />
  <meta name="twitter:description" content="${escapeAttr(ogDescription)}" />
  <meta name="twitter:image" content="${escapeAttr(ogImage)}" />

  <!-- Redirect human visitors -->
  <meta http-equiv="refresh" content="0;url=${escapeAttr(canonicalUrl)}" />
</head>
<body>
  <p>Redirecting to <a href="${escapeAttr(canonicalUrl)}">KeepPray.ing</a>…</p>
  <script>window.location.replace(${JSON.stringify(canonicalUrl)});</script>
</body>
</html>`;

    return new Response(html, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (e) {
    console.error("og-prayer-preview error:", e);
    return Response.redirect(fallbackRedirect, 302);
  }
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
