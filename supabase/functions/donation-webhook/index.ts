import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // This is called from the frontend after successful checkout to verify and record the donation
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(token);
    const user = userData.user;
    if (!user) throw new Error("Not authenticated");

    // Check if user has any completed Stripe checkout sessions
    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    if (customers.data.length === 0) {
      return new Response(JSON.stringify({ donor: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sessions = await stripe.checkout.sessions.list({
      customer: customers.data[0].id,
      limit: 100,
    });

    const completedSessions = sessions.data.filter(s => s.payment_status === "paid");
    if (completedSessions.length === 0) {
      return new Response(JSON.stringify({ donor: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Record donation and update donor status
    const totalDonors = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_donor", true);

    const donorCount = totalDonors.count || 0;
    const isFounder = donorCount < 100;

    await supabase.from("profiles").update({
      is_donor: true,
      is_founder: isFounder ? true : undefined,
      first_donated_at: new Date().toISOString(),
    }).eq("id", user.id).is("first_donated_at", null);

    // Also update for existing donors who already have a date
    await supabase.from("profiles").update({
      is_donor: true,
      is_founder: isFounder || undefined,
    }).eq("id", user.id);

    return new Response(JSON.stringify({ donor: true, founder: isFounder }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Donation webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
