import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LENSES = [
  "verse_anchor",
  "worry_and_peace",
  "fallen_nature",
  "daily_application",
  "original_language",
  "historical_context",
  "prayer_without_ceasing",
  "gratitude_and_wonder",
] as const;

const LENS_DESCRIPTIONS: Record<string, string> = {
  verse_anchor:
    "Expound deeply on one standout verse from this chapter, letting it unfold layer by layer until the reader sees something they never noticed before.",
  worry_and_peace:
    "Read this chapter through the lens of anxiety and worry — let the Scripture speak calm and peace into a restless heart, showing how God meets us in our fears.",
  fallen_nature:
    "Contemplate human brokenness and the reality of sin nature that this chapter reveals, then show how only God's grace provides the answer we cannot manufacture ourselves.",
  daily_application:
    "Draw out practical wisdom for everyday life — work stress, parenting, relationships, finances — showing how this ancient text speaks directly into modern struggles.",
  original_language:
    "Find one Hebrew or Greek word in this passage that unlocks unexpected meaning when you dig into its root. Let that word reshape how the entire chapter reads.",
  historical_context:
    "Transport the reader to the world of the original audience. What did this passage mean to them? How does understanding their world change everything for us today?",
  prayer_without_ceasing:
    "Use this passage as fuel for an ongoing conversation with God. Let the journal entry itself become a prayer — moving between reflection and direct address to the Father.",
  gratitude_and_wonder:
    "Let pure awe wash over the reading. What has God done, is doing, and will do? Find the thread of grace running through every verse and respond with wonder.",
};

function pickLensPair(excludeLens?: string): [string, string] {
  const available = LENSES.filter((l) => l !== excludeLens);
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return [shuffled[0], shuffled[1]];
}

function buildSystemPrompt(primaryLens: string, secondaryLens: string): string {
  return `You are a thoughtful believer who has walked with God for years but still gets surprised by Scripture every day. You are not a seminary professor lecturing — you are a fellow traveler writing in your own journal. You love Jesus deeply. You believe the Bible is the inspired, sufficient Word of God. Your theology is Protestant evangelical, Trinitarian, anchored in grace.

VOICE & TONE:
- Write in first person ("I noticed...", "This hit me today because...", "I keep coming back to...")
- Sound like a real person growing and learning — not preachy, not over-the-top, not artificially spiritual
- Vary sentence length and rhythm naturally. Short punches. Then longer, more contemplative sentences that let the thought breathe.
- Reference real human experiences: work stress, parenting challenges, doubt, loss, joy, mundane Tuesday afternoons, waiting rooms, sleepless nights
- Never use churchy buzzwords without earning them. If you say "grace," show what grace looks like in the mud.

STRUCTURE:
- Minimum 4 paragraphs, natural flow (never bullet points or numbered lists)
- Open with what drew you in — a phrase, a word, an image, a tension in the text
- Include at least one Hebrew or Greek insight woven naturally into the reflection (not as an academic footnote — as a discovery that changed how you read the verse)
- Include one cross-reference to another passage that deepens the chapter's meaning
- Always end with thanksgiving and praise — not formulaic, but genuine, like you're actually talking to God at the end

PRIMARY CONTEMPLATIVE LENS: ${primaryLens.replace(/_/g, " ")}
${LENS_DESCRIPTIONS[primaryLens]}

SECONDARY UNDERTONE: ${secondaryLens.replace(/_/g, " ")}
Let this secondary theme subtly color the reflection without dominating it.

DOCTRINAL GUARDRAILS:
- Scripture is sufficient and authoritative
- Salvation by grace alone through faith alone
- The Holy Spirit is active and personal
- Human wisdom is limited; God's wisdom is infinite
- Suffering has purpose even when we cannot see it
- Every passage ultimately points to Christ

CRITICAL: Your response must be valid JSON with this exact structure:
{
  "journal_text": "The full journal entry text here...",
  "tags": ["3-6 lowercase theological/topical keywords"],
  "summary_line": "One sentence summary, max 80 characters"
}

The journal_text should be the beautifully written reflection. The tags should capture the key theological themes. The summary_line should be a brief, evocative one-liner.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify JWT
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!
    ).auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      book_usfm,
      chapter_number,
      chapter_title,
      verses,
      model_hint = "default",
      parent_entry_id,
      exclude_lens,
    } = body;

    if (!book_usfm || !chapter_number || !verses?.length) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: book_usfm, chapter_number, verses" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const [primaryLens, secondaryLens] = pickLensPair(exclude_lens);
    const systemPrompt = buildSystemPrompt(primaryLens, secondaryLens);

    // Build chapter text
    const chapterText = verses
      .map((v: { number: number; text: string }) => `${v.number}. ${v.text}`)
      .join("\n");

    const userPrompt = `Please write a journal entry for ${chapter_title || `${book_usfm} ${chapter_number}`}. Here is the full chapter text:\n\n${chapterText}`;

    let journalText: string;
    let tags: string[] = [];
    let summaryLine = "";
    let modelUsed: string;

    if (model_hint === "refresh") {
      // Use Grok for refresh
      const grokKey = Deno.env.get("GROK_API_KEY");
      if (!grokKey) {
        return new Response(
          JSON.stringify({ error: "Grok API key not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const grokRes = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${grokKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "grok-4-0709",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.85,
          max_tokens: 3000,
        }),
      });

      if (!grokRes.ok) {
        const errText = await grokRes.text();
        console.error("Grok API error:", errText);
        return new Response(
          JSON.stringify({ error: "Bible Sight refresh temporarily unavailable" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const grokData = await grokRes.json();
      const rawContent = grokData.choices?.[0]?.message?.content ?? "";
      modelUsed = "grok-4-0709";

      try {
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        const parsed = JSON.parse(jsonMatch?.[0] ?? rawContent);
        journalText = parsed.journal_text || rawContent;
        tags = parsed.tags || [];
        summaryLine = parsed.summary_line || "";
      } catch {
        journalText = rawContent;
      }
    } else {
      // Use Lovable AI Gateway (Gemini)
      const lovableKey = Deno.env.get("LOVABLE_API_KEY");
      if (!lovableKey) {
        return new Response(
          JSON.stringify({ error: "AI gateway not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const aiRes = await fetch("https://ai.lovable.dev/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.8,
          max_tokens: 3000,
          response_format: { type: "json_object" },
        }),
      });

      if (!aiRes.ok) {
        const errText = await aiRes.text();
        console.error("Lovable AI error:", errText);
        return new Response(
          JSON.stringify({ error: "Bible Sight temporarily unavailable" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const aiData = await aiRes.json();
      const rawContent = aiData.choices?.[0]?.message?.content ?? "";
      modelUsed = "gemini-2.5-pro";

      try {
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        const parsed = JSON.parse(jsonMatch?.[0] ?? rawContent);
        journalText = parsed.journal_text || rawContent;
        tags = parsed.tags || [];
        summaryLine = parsed.summary_line || "";
      } catch {
        journalText = rawContent;
      }
    }

    // Save to bible_sight_entries
    const { data: entry, error: insertError } = await supabase
      .from("bible_sight_entries")
      .insert({
        user_id: user.id,
        book_usfm,
        chapter_number,
        version_id: body.version_id || 1,
        content: journalText,
        lens_used: primaryLens,
        model_used: modelUsed,
        tags,
        summary_line: summaryLine,
        is_refresh: model_hint === "refresh",
        parent_entry_id: parent_entry_id || null,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("DB insert error:", insertError);
    }

    return new Response(
      JSON.stringify({
        journal_text: journalText,
        lens_used: primaryLens,
        model_used: modelUsed,
        tags,
        summary_line: summaryLine,
        entry_id: entry?.id || null,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (err) {
    console.error("generate-journal error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
