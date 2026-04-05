import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Structured output schema via tool calling */
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
              verseRange: {
                type: "array",
                items: { type: "integer" },
                description: "Start and end verse numbers [start, end]",
              },
              label: {
                type: "string",
                description: "Short thematic label for the bunch",
              },
              type: {
                type: "string",
                enum: ["thematic", "narrative", "doctrinal", "prophetic", "poetic"],
              },
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
              tokenSpan: {
                type: "string",
                description: "The exact word or phrase to highlight",
              },
              tag: {
                type: "string",
                enum: [
                  "greek_root",
                  "hebrew_root",
                  "key_theme",
                  "repeated_word",
                  "literary_device",
                ],
              },
              colorHint: {
                type: "string",
                enum: ["amber", "cyan"],
                description: "amber for thematic, cyan for linguistic",
              },
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
              anchors: {
                type: "array",
                items: { type: "integer" },
                description: "Start and end verse [start, end]",
              },
              title: { type: "string" },
              body: {
                type: "string",
                description:
                  "2+ paragraphs: 1st-century context, original language roots, theological significance, life application. Use markdown for formatting.",
              },
              citations: {
                type: "array",
                items: { type: "string" },
                description: "Cross-reference passages e.g. 'Isaiah 40:3'",
              },
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
              to: {
                type: "string",
                description: "Target passage reference e.g. 'Isaiah 40:3'",
              },
              type: {
                type: "string",
                enum: ["quotation", "allusion", "parallel", "contrast", "fulfillment"],
              },
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

const SYSTEM_PROMPT = `You are a seminary professor performing Historical-Grammatical exegesis of a Bible chapter. Your task is to produce a structured analysis that will be displayed alongside the scripture text in a study Bible interface.

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
- Use markdown formatting in card bodies (bold for Greek/Hebrew terms, italics for emphasis)

Call the deliver_enrichment function with your complete analysis.`;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { book_usfm, chapter_number, version_id, verses } = await req.json();

    if (!book_usfm || !chapter_number || !verses?.length) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Service role client for DB operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Cache check
    const { data: cached } = await supabaseAdmin
      .from("enriched_chapters")
      .select("content_json, model_version")
      .eq("book_usfm", book_usfm)
      .eq("chapter_number", chapter_number)
      .eq("version_id", version_id)
      .maybeSingle();

    if (cached) {
      return new Response(JSON.stringify(cached.content_json), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Format verses for the prompt
    const verseText = verses
      .map((v: { number: number; text: string }) => `${v.number}. ${v.text}`)
      .join("\n");

    const userPrompt = `Analyze this chapter: ${book_usfm} Chapter ${chapter_number}\n\n${verseText}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const modelId = "google/gemini-2.5-pro";

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelId,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          tools: [ENRICH_TOOL],
          tool_choice: {
            type: "function",
            function: { name: "deliver_enrichment" },
          },
        }),
      }
    );

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Deep Study is experiencing high demand. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "Deep Study usage limit reached. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", status, errText);
      throw new Error(`AI gateway returned ${status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("No tool call in AI response:", JSON.stringify(aiData));
      throw new Error("AI did not return structured enrichment data");
    }

    let enrichment: Record<string, unknown>;
    try {
      enrichment = JSON.parse(toolCall.function.arguments);
    } catch (parseErr) {
      console.error("Failed to parse tool call arguments:", toolCall.function.arguments);
      throw new Error("Invalid enrichment data from AI");
    }

    // Upsert into cache
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

    if (upsertError) {
      console.error("Cache upsert error:", upsertError);
      // Still return the data even if caching failed
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
