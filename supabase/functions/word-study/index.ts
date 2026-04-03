const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const OT_BOOKS = new Set([
  "GEN","EXO","LEV","NUM","DEU","JOS","JDG","RUT","1SA","2SA","1KI","2KI",
  "1CH","2CH","EZR","NEH","EST","JOB","PSA","PRO","ECC","SNG","ISA","JER",
  "LAM","EZK","DAN","HOS","JOL","AMO","OBA","JON","MIC","NAM","HAB","ZEP",
  "HAG","ZEC","MAL",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { word, verseText, bookUsfm, chapter, verseNumber, translationId } = await req.json();

    if (!word || !verseText || !bookUsfm) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "AI not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const isOT = OT_BOOKS.has(bookUsfm);
    const testament = isOT ? "Old Testament (Hebrew/Aramaic)" : "New Testament (Greek)";
    const originalLang = isOT ? "Hebrew" : "Greek";

    const systemPrompt = `You are a biblical scholar specializing in original languages and cross-referencing. You are studying a word from the ${testament}.

Given the English word "${word}" found in verse context: "${verseText}" (${bookUsfm} ${chapter}:${verseNumber}), provide a comprehensive word study.

The original language is ${originalLang}. Identify the specific ${originalLang} word this English word translates in this context. Provide the Strong's concordance number, transliteration, definition, approximate frequency in the ${isOT ? "Old" : "New"} Testament, and semantic range.

Also provide up to 6 of the most important cross-references where this same ${originalLang} word (or its closest cognate) appears in significant theological contexts. For each reference, include a brief preview of the verse text (first 60 characters) and a short relevance note.

Finally, write a 2-3 sentence contextual note explaining the significance of this word in its immediate context, suitable for devotional or academic study.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Study the word "${word}" in context: "${verseText}"` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "word_study_result",
              description: "Return structured word study data for a Bible word",
              parameters: {
                type: "object",
                properties: {
                  originalWord: { type: "string", description: "The original Hebrew or Greek word" },
                  transliteration: { type: "string", description: "Transliteration of the original word" },
                  strongsNumber: { type: "string", description: "Strong's concordance number (e.g. H1285 or G26)" },
                  definition: { type: "string", description: "Brief definition/gloss" },
                  frequency: { type: "number", description: "Approximate number of times used in OT or NT" },
                  semanticRange: {
                    type: "array",
                    items: { type: "string" },
                    description: "Array of English words in the semantic range",
                  },
                  crossReferences: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        reference: { type: "string", description: "e.g. Jeremiah 31:31" },
                        bookUsfm: { type: "string", description: "USFM book code e.g. JER" },
                        chapter: { type: "number" },
                        verse: { type: "number" },
                        preview: { type: "string", description: "First ~60 chars of verse text" },
                        relevance: { type: "string", description: "Brief relevance note" },
                      },
                      required: ["reference", "bookUsfm", "chapter", "verse", "preview", "relevance"],
                      additionalProperties: false,
                    },
                  },
                  contextualNote: { type: "string", description: "2-3 sentence contextual explanation" },
                },
                required: ["originalWord", "transliteration", "strongsNumber", "definition", "frequency", "semanticRange", "crossReferences", "contextualNote"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "word_study_result" } },
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited — please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      console.error("AI API error:", response.status, await response.text());
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(aiData));
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let result: any;
    try {
      result = typeof toolCall.function.arguments === "string"
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;
    } catch {
      console.error("Failed to parse tool call arguments:", toolCall.function.arguments);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("word-study error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
