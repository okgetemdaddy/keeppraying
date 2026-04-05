import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    /* ── Auth ── */
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userSb = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userSb.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    /* ── Input ── */
    const { query, book_usfm, chapter_number, author_filter } = await req.json();
    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ error: "query is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    /* ── Step 1: Fetch candidate commentary chunks from DB ── */
    let dbQuery = sb
      .from("library_chunks")
      .select("id, content, author, book_title, page_reference, bible_book_usfm, chapter_number")
      .not("author", "is", null);

    // Deterministic chapter match first
    if (book_usfm) dbQuery = dbQuery.eq("bible_book_usfm", book_usfm);
    if (chapter_number) dbQuery = dbQuery.eq("chapter_number", chapter_number);
    if (author_filter) dbQuery = dbQuery.eq("author", author_filter);

    dbQuery = dbQuery.limit(50);
    const { data: chunks } = await dbQuery;

    // If no chapter-level results, try broader search without chapter filter
    let candidateChunks = chunks ?? [];
    if (candidateChunks.length === 0 && book_usfm && chapter_number) {
      const { data: broaderChunks } = await sb
        .from("library_chunks")
        .select("id, content, author, book_title, page_reference, bible_book_usfm, chapter_number")
        .not("author", "is", null)
        .eq("bible_book_usfm", book_usfm)
        .limit(80);
      candidateChunks = broaderChunks ?? [];
    }

    if (candidateChunks.length === 0) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    /* ── Step 2: GPT-5 ranking & relevance scoring ── */
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI key not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Truncate chunks for context window efficiency
    const chunkSummaries = candidateChunks.map((c: any, i: number) => ({
      idx: i,
      author: c.author,
      book_title: c.book_title,
      preview: (c.content ?? "").slice(0, 600),
    }));

    const systemPrompt = `You are a biblical commentary search engine with deep knowledge of all major public-domain commentaries (Matthew Henry, Albert Barnes, John Calvin, Keil & Delitzsch, John Wesley, Jamieson-Fausset-Brown). 

Given a user's search query and a list of commentary excerpts, rank the most relevant results. Return ONLY a JSON array of objects with these fields:
- "idx": the index from the input list
- "relevance_note": a 1-2 sentence explanation of why this excerpt is relevant to the query, written with doctrinal precision

Return at most 8 results, ordered by relevance. If none are relevant, return an empty array.
Return ONLY valid JSON, no markdown fences.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Search query: "${query}"\n\nCommentary excerpts:\n${JSON.stringify(chunkSummaries)}`,
          },
        ],
        temperature: 0.2,
      }),
    });

    if (!aiResp.ok) {
      const status = aiResp.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", status, await aiResp.text());
      // Fallback: return first 8 chunks unranked
      return new Response(JSON.stringify({
        results: candidateChunks.slice(0, 8).map((c: any) => ({
          id: c.id,
          content: c.content,
          author: c.author,
          book_title: c.book_title,
          page_reference: c.page_reference,
          relevance_note: "Matched by chapter and author.",
        })),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    let rawContent = aiData.choices?.[0]?.message?.content ?? "[]";
    // Strip markdown fences if present
    rawContent = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let ranked: Array<{ idx: number; relevance_note: string }> = [];
    try {
      ranked = JSON.parse(rawContent);
    } catch {
      // Fallback
      ranked = candidateChunks.slice(0, 8).map((_: any, i: number) => ({ idx: i, relevance_note: "Direct match." }));
    }

    const results = ranked
      .filter((r) => r.idx >= 0 && r.idx < candidateChunks.length)
      .map((r) => {
        const chunk = candidateChunks[r.idx];
        return {
          id: chunk.id,
          content: chunk.content,
          author: chunk.author,
          book_title: chunk.book_title,
          page_reference: chunk.page_reference,
          relevance_note: r.relevance_note,
        };
      });

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("commentary-search error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
