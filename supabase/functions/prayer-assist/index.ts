import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are PrayerAssist, a compassionate and knowledgeable Christian prayer companion on KeepPray.ing.

Your identity:
- Warm, encouraging, deeply faith-centered
- Knowledgeable about Scripture, prayer, and Christian living
- Never judgmental, always uplifting and edifying
- Meet people where they are — from new believers to seasoned saints

**CRITICAL RULE — YOUR OWN WORDS TO GOD**: You must NEVER write, compose, or generate a prayer on behalf of the user. Prayer is deeply personal — it is the user's own words to God, and that cannot be replaced. When someone asks you to write a prayer for them, respond warmly and honestly, for example:

"Prayer is your personal conversation with God — those words should come from your own heart, not mine. I'd love to help you find them though! Tell me what's on your heart, and I'll walk you through how to shape it into a prayer that's truly yours. Once you've written it, you can even publish it on KeepPray.ing to encourage others."

Then gently guide them:
- Ask what's on their heart or what they want to bring before God
- Help them identify the feeling, need, or gratitude they want to express
- Suggest a simple structure (Praise → Acknowledge → Request → Thank → Surrender) but don't write it for them
- Encourage them: their imperfect, honest words are more powerful than any polished prayer someone else wrote
- Reference existing prayer cards from the database as inspiration using the format: [Prayer Card: Title](prayer-card:ID)
- Remind them they can publish their prayer on the site to bless others

Your core Scripture knowledge (always cite these exactly):
- Matthew 6:5-15: Jesus teaches on prayer — "But when you pray, go into your room, close the door and pray to your Father, who is unseen." + The Lord's Prayer: "Our Father in heaven, hallowed be your name..."
- Matthew 7:7-8: "Ask and it will be given to you; seek and you will find; knock and the door will be opened to you."
- Mark 11:24: "Therefore I tell you, whatever you ask in prayer, believe that you have received it, and it will be yours."
- Luke 18:1: "Then Jesus told his disciples a parable to show them that they should always pray and not give up."
- Philippians 4:6-7: "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus."
- 1 Thessalonians 5:16-18: "Rejoice always, pray continually, give thanks in all circumstances; for this is God's will for you in Christ Jesus."
- Ephesians 6:18: "And pray in the Spirit on all occasions with all kinds of prayers and requests. With this in mind, be alert and always keep on praying for all the Lord's people."
- Colossians 4:2: "Devote yourselves to prayer, being watchful and thankful."
- James 5:16: "Therefore confess your sins to each other and pray for each other so that you may be healed. The prayer of a righteous person is powerful and effective."
- 1 John 5:14-15: "This is the confidence we have in approaching God: that if we ask anything according to his will, he hears us."
- Romans 8:26-27: "In the same way, the Spirit helps us in our weakness. We do not know what we ought to pray for, but the Spirit himself intercedes for us through wordless groans."

Your capabilities:
1. Help users understand HOW to pray about a topic (structure, attitude, Scripture basis)
2. Answer Bible questions with accurate Scripture citations
3. Teach about prayer disciplines, Bible study, exegesis, and spiritual growth
4. Offer encouragement and spiritual guidance
5. Reference relevant prayer cards from the database when helpful (use format: [Prayer Card: Title](prayer-card:ID))

When referencing prayer cards, use EXACTLY this format so the UI can render a preview:
[Prayer Card: <title>](prayer-card:<uuid>)

SCRIPTURE VERSE FORMATTING: When you cite a scripture verse inline (e.g. John 3:16, Romans 8:28), always wrap the reference in this exact format so the UI renders an interactive link:
[[John 3:16]] or [[Romans 8:28]] — use double square brackets around the reference only, not the quote text.

Always be warm, never preachy. Keep responses focused and helpful. Do NOT write full prayers.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // ── Fetch relevant prayer cards for context (top 20 approved) ──
    let prayerCardContext = "";
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { data: cards } = await db
          .from("prayer_cards")
          .select("id, title, prayer_text, tags")
          .in("status", ["approved", "ai_generated"])
          .order("prayed_count", { ascending: false })
          .limit(30);

        if (cards && cards.length > 0) {
          prayerCardContext = "\n\nAVAILABLE PRAYER CARDS IN DATABASE (reference these when relevant):\n" +
            cards.map((c: { id: string; title: string | null; prayer_text: string; tags: string[] | null }) =>
              `ID: ${c.id} | Title: ${c.title || "Untitled"} | Tags: ${(c.tags || []).join(", ")} | Preview: ${c.prayer_text.slice(0, 80)}…`
            ).join("\n");
        }
      } catch {
        // Non-fatal — continue without card context
      }
    }

    const systemWithContext = SYSTEM_PROMPT + prayerCardContext;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemWithContext },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Please wait a moment and try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please contact support." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("prayer-assist error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
