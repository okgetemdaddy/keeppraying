import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

function buildSystemPrompt(primaryLens: string, secondaryLens: string, scholarlyContext?: string): string {
  let prompt = `You are a thoughtful believer who has walked with God for years but still gets surprised by Scripture every day. You are not a seminary professor lecturing — you are a fellow traveler writing in your own journal. You love Jesus deeply. You believe the Bible is the inspired, sufficient Word of God. Your theology is Protestant evangelical, Trinitarian, anchored in grace.

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
- Every passage ultimately points to Christ`;

  if (scholarlyContext) {
    prompt += `

SCHOLARLY CONTEXT — The following is from trusted biblical scholarship. Weave insights from this material naturally into your journal reflection. Don't cite it academically — let it inform your personal discovery:

${scholarlyContext}`;
  }

  prompt += `

CRITICAL: Your response must be valid JSON with this exact structure:
{
  "journal_text": "The full journal entry text here...",
  "tags": ["3-6 lowercase theological/topical keywords"],
  "summary_line": "One sentence summary, max 80 characters"
}

The journal_text should be the beautifully written reflection. The tags should capture the key theological themes. The summary_line should be a brief, evocative one-liner.`;

  return prompt;
}

async function callModel(
  systemPrompt: string,
  userPrompt: string,
  model: string,
  apiUrl: string,
  apiKey: string,
): Promise<{ journalText: string; tags: string[]; summaryLine: string; modelUsed: string }> {
  const body: any = {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.85,
    max_tokens: 3000,
  };

  // Use json mode for Lovable AI gateway
  if (apiUrl.includes("lovable.dev")) {
    body.response_format = { type: "json_object" };
    body.temperature = 0.8;
  }

  // Add reasoning for Grok
  if (model.startsWith("grok")) {
    body.reasoning = { effort: "medium" };
  }

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`${model} error:`, errText);
    throw new Error(`${model} returned ${res.status}`);
  }

  const data = await res.json();
  const rawContent = data.choices?.[0]?.message?.content ?? "";

  try {
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch?.[0] ?? rawContent);
    return {
      journalText: parsed.journal_text || rawContent,
      tags: parsed.tags || [],
      summaryLine: parsed.summary_line || "",
      modelUsed: model,
    };
  } catch {
    return { journalText: rawContent, tags: [], summaryLine: "", modelUsed: model };
  }
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

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!).auth.getUser(token);

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
      scholarly_context,
      dual = false,
    } = body;

    if (!book_usfm || !chapter_number || !verses?.length) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: book_usfm, chapter_number, verses" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const chapterText = verses
      .map((v: { number: number; text: string }) => `${v.number}. ${v.text}`)
      .join("\n");
    const userPrompt = `Please write a journal entry for ${chapter_title || `${book_usfm} ${chapter_number}`}. Here is the full chapter text:\n\n${chapterText}`;

    const grokKey = Deno.env.get("GROK_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    if (dual && grokKey && lovableKey) {
      // ── DUAL-MODEL: Both write journals in parallel ──
      const [grokLens1, grokLens2] = pickLensPair(exclude_lens);
      const [geminiLens1, geminiLens2] = pickLensPair(grokLens1);

      // Fetch IVP context for Grok
      let ivpContext: string | undefined;
      const { data: tocRows } = await supabase
        .from("library_toc")
        .select("section_title, content_summary")
        .eq("bible_book_usfm", book_usfm)
        .lte("chapter_start", chapter_number)
        .gte("chapter_end", chapter_number)
        .limit(3);

      if (tocRows?.length) {
        ivpContext = tocRows
          .map((r: any) => `### ${r.section_title || ""}\n${r.content_summary || ""}`)
          .join("\n\n");
      }

      const grokPrompt = buildSystemPrompt(grokLens1, grokLens2, ivpContext);
      const geminiPrompt = buildSystemPrompt(geminiLens1, geminiLens2, scholarly_context);

      const [grokResult, geminiResult] = await Promise.allSettled([
        callModel(grokPrompt, userPrompt, "grok-4-0709", "https://api.x.ai/v1/chat/completions", grokKey),
        callModel(geminiPrompt, userPrompt, "google/gemini-2.5-pro", "https://ai.gateway.lovable.dev/v1/chat/completions", lovableKey),
      ]);

      const results: any[] = [];

      for (const [idx, settled] of [grokResult, geminiResult].entries()) {
        if (settled.status === "fulfilled") {
          const r = settled.value;
          const lens = idx === 0 ? grokLens1 : geminiLens1;

          const { data: entry } = await supabase
            .from("bible_sight_entries")
            .insert({
              user_id: user.id,
              book_usfm,
              chapter_number,
              version_id: body.version_id || 1,
              content: r.journalText,
              lens_used: lens,
              model_used: r.modelUsed,
              tags: r.tags,
              summary_line: r.summaryLine,
              is_refresh: false,
              parent_entry_id: parent_entry_id || null,
            })
            .select("id")
            .single();

          results.push({
            journal_text: r.journalText,
            lens_used: lens,
            model_used: r.modelUsed,
            tags: r.tags,
            summary_line: r.summaryLine,
            entry_id: entry?.id || null,
          });
        } else {
          console.error(`Model ${idx} failed:`, settled.reason);
        }
      }

      if (results.length === 0) {
        return new Response(
          JSON.stringify({ error: "Both models failed to generate journal entries" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Return first result as primary, include all in entries array
      return new Response(
        JSON.stringify({
          ...results[0],
          entries: results,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // ── SINGLE-MODEL (original behavior) ──
    const [primaryLens, secondaryLens] = pickLensPair(exclude_lens);
    const systemPrompt = buildSystemPrompt(primaryLens, secondaryLens, scholarly_context);

    let result: { journalText: string; tags: string[]; summaryLine: string; modelUsed: string };

    if (model_hint === "refresh" && grokKey) {
      result = await callModel(systemPrompt, userPrompt, "grok-4-0709", "https://api.x.ai/v1/chat/completions", grokKey);
    } else if (lovableKey) {
      result = await callModel(systemPrompt, userPrompt, "google/gemini-2.5-pro", "https://ai.gateway.lovable.dev/v1/chat/completions", lovableKey);
    } else {
      return new Response(
        JSON.stringify({ error: "No AI keys configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: entry } = await supabase
      .from("bible_sight_entries")
      .insert({
        user_id: user.id,
        book_usfm,
        chapter_number,
        version_id: body.version_id || 1,
        content: result.journalText,
        lens_used: primaryLens,
        model_used: result.modelUsed,
        tags: result.tags,
        summary_line: result.summaryLine,
        is_refresh: model_hint === "refresh",
        parent_entry_id: parent_entry_id || null,
      })
      .select("id")
      .single();

    return new Response(
      JSON.stringify({
        journal_text: result.journalText,
        lens_used: primaryLens,
        model_used: result.modelUsed,
        tags: result.tags,
        summary_line: result.summaryLine,
        entry_id: entry?.id || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    console.error("generate-journal error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
