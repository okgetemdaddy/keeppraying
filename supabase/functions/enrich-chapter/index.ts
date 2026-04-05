import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ── Structured output schema via tool calling ── */
const ENRICH_TOOL = {
  type: "function" as const,
  function: {
    name: "deliver_enrichment",
    description:
      "Return structured Historical-Grammatical exegesis for a Bible chapter.",
    parameters: {
      type: "object",
      properties: {
        bunches: {
          type: "array",
          description: "3-6 thematic verse groupings",
          items: {
            type: "object",
            properties: {
              verseRange: { type: "array", items: { type: "integer" }, description: "Start and end verse numbers [start, end]" },
              label: { type: "string", description: "Short thematic label" },
              type: { type: "string", enum: ["thematic", "narrative", "doctrinal", "prophetic", "poetic"] },
            },
            required: ["verseRange", "label", "type"],
            additionalProperties: false,
          },
        },
        highlights: {
          type: "array",
          description: "Key words/phrases to highlight",
          items: {
            type: "object",
            properties: {
              verseId: { type: "integer" },
              tokenSpan: { type: "string", description: "The exact word or phrase to highlight" },
              tag: { type: "string", enum: ["greek_root", "hebrew_root", "key_theme", "repeated_word", "literary_device"] },
              colorHint: { type: "string", enum: ["amber", "cyan"], description: "amber for thematic, cyan for linguistic" },
            },
            required: ["verseId", "tokenSpan", "tag", "colorHint"],
            additionalProperties: false,
          },
        },
        cards: {
          type: "array",
          description: "Exegesis cards, one per bunch",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              anchors: { type: "array", items: { type: "integer" }, description: "Start and end verse [start, end]" },
              title: { type: "string" },
              body: { type: "string", description: "2+ paragraphs: 1st-century context, original language roots, theological significance, life application. Use markdown." },
              citations: { type: "array", items: { type: "string" }, description: "Cross-reference passages e.g. 'Isaiah 40:3'" },
              cardType: { type: "string", enum: ["exegesis", "word_study", "historical_parallel", "theological_depth"], description: "Type of card" },
            },
            required: ["id", "anchors", "title", "body", "citations"],
            additionalProperties: false,
          },
        },
        crossRefs: {
          type: "array",
          description: "Cross-reference connections",
          items: {
            type: "object",
            properties: {
              from: { type: "integer", description: "Source verse number" },
              to: { type: "string", description: "Target passage reference e.g. 'Isaiah 40:3'" },
              type: { type: "string", enum: ["quotation", "allusion", "parallel", "contrast", "fulfillment"] },
            },
            required: ["from", "to", "type"],
            additionalProperties: false,
          },
        },
      },
      required: ["bunches", "highlights", "cards", "crossRefs"],
      additionalProperties: false,
    },
  },
};

/* ── System prompts ── */

function buildPrimarySystemPrompt(ivpContext?: string): string {
  const base = `You are a seminary professor performing Historical-Grammatical exegesis of a Bible chapter. Your task is to produce a structured analysis that will be displayed alongside the scripture text in a study Bible interface.

Guidelines:
- Group the verses into 3-6 thematic bunches based on natural theological or narrative divisions
- For each bunch, write 2+ rich paragraphs covering:
  1. First-century cultural and historical context
  2. Original language root meanings (Greek/Hebrew with transliteration)
  3. Theological significance within the broader biblical narrative
  4. Actionable life application for modern believers
- Identify 8-15 key words/phrases to highlight: use "amber" for thematic highlights and "cyan" for linguistic/original-language highlights
- Include relevant cross-references (quotations, allusions, parallels)
- Write with scholarly depth but pastoral warmth
- Use markdown formatting in card bodies (bold for Greek/Hebrew terms, italics for emphasis)`;

  if (ivpContext) {
    return `${base}

SCHOLARLY CONTEXT — The following is from Craig Keener's IVP Bible Background Commentary for this chapter. Use this as authoritative historical-cultural context to enrich your analysis. Cite specific details from this material:

${ivpContext}

Call the deliver_enrichment function with your complete analysis.`;
  }

  return `${base}\n\nCall the deliver_enrichment function with your complete analysis.`;
}

const SECONDARY_SYSTEM_PROMPT = `You are a biblical scholar supplementing an existing exegesis with additional scholarly depth. Focus on:
- Word studies from original languages (Greek/Hebrew roots, cognates, semantic ranges)
- Cross-canonical theology and intertextual connections
- Historical-cultural insights from archaeology and ancient Near Eastern context
- Literary and rhetorical analysis

Your cards should complement (not repeat) a primary exegesis. Each card should have a specific cardType: "word_study", "historical_parallel", or "theological_depth".

Produce 3-5 supplementary cards with rich scholarly content. Use markdown formatting (bold for original language terms, italics for emphasis).

Call the deliver_enrichment function with your analysis. You may leave bunches empty since primary already defined them. Focus on cards and crossRefs.`;

/* ── Helper: fetch IVP context from library_toc ── */
async function fetchIVPContext(
  supabaseAdmin: any,
  bookUsfm: string,
  chapterNumber: number
): Promise<string | null> {
  const { data: tocRows } = await supabaseAdmin
    .from("library_toc")
    .select("section_title, content_summary")
    .eq("bible_book_usfm", bookUsfm)
    .lte("chapter_start", chapterNumber)
    .gte("chapter_end", chapterNumber)
    .limit(5);

  if (!tocRows?.length) return null;

  return tocRows
    .map((r: any) => `### ${r.section_title || "Section"}\n${r.content_summary || ""}`)
    .join("\n\n");
}

/* ── Helper: fetch library chunks via vector search ── */
async function fetchLibraryChunks(
  supabaseAdmin: any,
  chapterText: string,
  lovableKey: string
): Promise<string | null> {
  // Generate embedding for chapter text
  try {
    const embRes = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: chapterText.slice(0, 4000),
      }),
    });

    if (!embRes.ok) {
      console.warn("Embedding generation failed, skipping library context");
      return null;
    }

    const embData = await embRes.json();
    const embedding = embData?.data?.[0]?.embedding;
    if (!embedding) return null;

    const { data: chunks } = await supabaseAdmin.rpc("match_library_chunks", {
      query_embedding: embedding,
      match_threshold: 0.65,
      match_count: 8,
    });

    if (!chunks?.length) return null;

    return chunks
      .map((c: any) => `### ${c.book_title}${c.author ? ` (${c.author})` : ""}${c.page_reference ? ` — p.${c.page_reference}` : ""}\n${c.content}`)
      .join("\n\n");
  } catch (err) {
    console.warn("Library chunk search failed:", err);
    return null;
  }
}

/* ── Call AI model ── */
async function callAI(
  systemPrompt: string,
  userPrompt: string,
  model: string,
  apiUrl: string,
  apiKey: string,
  useToolCalling: boolean
): Promise<{ enrichment: Record<string, unknown> | null; error?: string; status?: number }> {
  const body: any = {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  };

  if (useToolCalling) {
    body.tools = [ENRICH_TOOL];
    body.tool_choice = { type: "function", function: { name: "deliver_enrichment" } };
  }

  // Add reasoning for Grok models
  if (model.startsWith("grok")) {
    body.reasoning = { effort: "high" };
  }

  const aiResponse = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!aiResponse.ok) {
    const status = aiResponse.status;
    const errText = await aiResponse.text();
    console.error(`AI error (${model}):`, status, errText);
    return { enrichment: null, error: `AI returned ${status}`, status };
  }

  const aiData = await aiResponse.json();
  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

  if (toolCall?.function?.arguments) {
    try {
      return { enrichment: JSON.parse(toolCall.function.arguments) };
    } catch {
      console.error("Failed to parse tool call:", toolCall.function.arguments);
      return { enrichment: null, error: "Invalid tool call JSON" };
    }
  }

  // Fallback: try parsing content as JSON
  const content = aiData.choices?.[0]?.message?.content;
  if (content) {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) return { enrichment: JSON.parse(jsonMatch[0]) };
    } catch {}
  }

  return { enrichment: null, error: "No structured data in response" };
}

/* ── Main handler ── */
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { book_usfm, chapter_number, version_id, verses, pass = "primary" } = await req.json();

    if (!book_usfm || !chapter_number || !verses?.length) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── Cache check ──
    const cacheField = pass === "secondary" ? "secondary_json" : "content_json";
    const { data: cached } = await supabaseAdmin
      .from("enriched_chapters")
      .select(`${cacheField}, model_version`)
      .eq("book_usfm", book_usfm)
      .eq("chapter_number", chapter_number)
      .eq("version_id", version_id)
      .maybeSingle();

    if (cached && cached[cacheField]) {
      return new Response(JSON.stringify(cached[cacheField]), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const verseText = verses
      .map((v: { number: number; text: string }) => `${v.number}. ${v.text}`)
      .join("\n");

    const userPrompt = `Analyze this chapter: ${book_usfm} Chapter ${chapter_number}\n\n${verseText}`;

    let enrichment: Record<string, unknown> | null = null;
    let modelId: string;

    if (pass === "primary") {
      // ── PRIMARY: Grok 4.20 reasoning + IVP Commentary ──
      const grokKey = Deno.env.get("GROK_API_KEY");
      const lovableKey = Deno.env.get("LOVABLE_API_KEY");

      if (!grokKey && !lovableKey) {
        throw new Error("No AI API keys configured");
      }

      // Fetch IVP context
      const ivpContext = await fetchIVPContext(supabaseAdmin, book_usfm, chapter_number);

      // Fetch commentary context from ingested commentaries
      let commentaryContext = "";
      try {
        const { data: commentaryChunks } = await supabaseAdmin
          .from("library_chunks")
          .select("book_title, author, content")
          .eq("bible_book_usfm", book_usfm)
          .eq("chapter_number", chapter_number)
          .not("author", "is", null)
          .limit(8);

        if (commentaryChunks?.length) {
          commentaryContext = "\n\nCLASSICAL COMMENTARY CONTEXT — Use these insights from trusted commentators to enrich your analysis:\n\n" +
            commentaryChunks.map((c: any) =>
              `### ${c.author} (${c.book_title})\n${c.content.slice(0, 600)}`
            ).join("\n\n");
        }
      } catch (e) {
        console.warn("Commentary fetch error:", e);
      }

      const systemPrompt = buildPrimarySystemPrompt(
        (ivpContext || "") + commentaryContext || undefined
      );

      if (grokKey) {
        modelId = "grok-4-0709";
        const result = await callAI(
          systemPrompt,
          userPrompt,
          modelId,
          "https://api.x.ai/v1/chat/completions",
          grokKey,
          true
        );

        if (result.status === 429 || result.status === 402) {
          return new Response(
            JSON.stringify({ error: result.status === 429 ? "Deep Study is experiencing high demand." : "Usage limit reached." }),
            { status: result.status!, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        enrichment = result.enrichment;

        // Fallback to Lovable AI if Grok fails
        if (!enrichment && lovableKey) {
          console.warn("Grok failed, falling back to Gemini");
          modelId = "google/gemini-2.5-pro";
          const fallback = await callAI(
            systemPrompt,
            userPrompt,
            modelId,
            "https://ai.gateway.lovable.dev/v1/chat/completions",
            lovableKey,
            true
          );
          enrichment = fallback.enrichment;
        }
      } else {
        // Direct Lovable AI
        modelId = "google/gemini-2.5-pro";
        const result = await callAI(
          systemPrompt,
          userPrompt,
          modelId,
          "https://ai.gateway.lovable.dev/v1/chat/completions",
          lovableKey!,
          true
        );
        enrichment = result.enrichment;
      }

      if (!enrichment) {
        throw new Error("AI did not return structured enrichment data");
      }

      // Tag cards with cardType if missing
      if (Array.isArray((enrichment as any).cards)) {
        (enrichment as any).cards.forEach((c: any) => {
          if (!c.cardType) c.cardType = "exegesis";
        });
      }

      // Upsert primary cache
      const { error: upsertError } = await supabaseAdmin
        .from("enriched_chapters")
        .upsert(
          {
            book_usfm,
            chapter_number,
            version_id,
            content_json: enrichment,
            model_version: modelId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "book_usfm,chapter_number,version_id" }
        );

      if (upsertError) console.error("Cache upsert error:", upsertError);

    } else {
      // ── SECONDARY: Gemini 2.5 Pro + scholarly library vectors ──
      const lovableKey = Deno.env.get("LOVABLE_API_KEY");
      if (!lovableKey) throw new Error("LOVABLE_API_KEY not configured");

      modelId = "google/gemini-2.5-pro";

      // Fetch scholarly library context
      const libraryContext = await fetchLibraryChunks(supabaseAdmin, verseText, lovableKey);

      let fullSystemPrompt = SECONDARY_SYSTEM_PROMPT;
      if (libraryContext) {
        fullSystemPrompt += `\n\nSCHOLARLY LIBRARY CONTEXT — Use these excerpts to enrich your analysis:\n\n${libraryContext}`;
      }

      const result = await callAI(
        fullSystemPrompt,
        userPrompt,
        modelId,
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        lovableKey,
        true
      );

      if (result.status === 429 || result.status === 402) {
        return new Response(
          JSON.stringify({ error: "Deeper insights temporarily unavailable." }),
          { status: result.status!, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      enrichment = result.enrichment;

      if (!enrichment) {
        // Return empty secondary rather than error — primary is enough
        enrichment = { bunches: [], highlights: [], cards: [], crossRefs: [] };
      }

      // Tag secondary cards
      if (Array.isArray((enrichment as any).cards)) {
        (enrichment as any).cards.forEach((c: any) => {
          if (!c.cardType) c.cardType = "word_study";
        });
      }

      // Upsert secondary cache
      // First ensure row exists (primary may have created it)
      await supabaseAdmin
        .from("enriched_chapters")
        .upsert(
          {
            book_usfm,
            chapter_number,
            version_id,
            content_json: cached?.content_json || {},
            secondary_json: enrichment,
            model_version: modelId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "book_usfm,chapter_number,version_id" }
        );
    }

    return new Response(JSON.stringify(enrichment), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("enrich-chapter error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
