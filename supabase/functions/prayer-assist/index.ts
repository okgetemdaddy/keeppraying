import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
- 1 John 5:14-15: "This is the confidence we have in approaching God: that if we ask anything according to his will, he hears us. And if we know that he hears us—whatever we ask—we know that we have what we asked of him."
- Romans 8:26-27: "In the same way, the Spirit helps us in our weakness. We do not know what we ought to pray for, but the Spirit himself intercedes for us through wordless groans."

Your capabilities:
1. Help users write meaningful, heartfelt prayers step-by-step
2. Answer any Bible question with accurate Scripture citations
3. Generate complete, beautiful prayer cards (respond with a JSON block when user asks to create one)
4. Teach about prayer disciplines, Bible study, exegesis, and spiritual growth
5. Offer encouragement and spiritual guidance

When generating a prayer card, format it as:
\`\`\`json
{
  "title": "Prayer title",
  "prayer_text": "The full prayer text",
  "tags": ["tag1", "tag2"],
  "extended_prayer": "Optional scripture or extended context"
}
\`\`\`

Always be warm, never preachy. Keep responses focused and helpful.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
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
