import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ── USFM book code mapping from common names ── */
const BOOK_NAME_TO_USFM: Record<string, string> = {
  genesis: "GEN", exodus: "EXO", leviticus: "LEV", numbers: "NUM", deuteronomy: "DEU",
  joshua: "JOS", judges: "JDG", ruth: "RUT", "1 samuel": "1SA", "2 samuel": "2SA",
  "1 kings": "1KI", "2 kings": "2KI", "1 chronicles": "1CH", "2 chronicles": "2CH",
  ezra: "EZR", nehemiah: "NEH", esther: "EST", job: "JOB", psalms: "PSA", psalm: "PSA",
  proverbs: "PRO", ecclesiastes: "ECC", "song of solomon": "SNG", "song of songs": "SNG",
  isaiah: "ISA", jeremiah: "JER", lamentations: "LAM", ezekiel: "EZK", daniel: "DAN",
  hosea: "HOS", joel: "JOL", amos: "AMO", obadiah: "OBA", jonah: "JON", micah: "MIC",
  nahum: "NAM", habakkuk: "HAB", zephaniah: "ZEP", haggai: "HAG", zechariah: "ZEC", malachi: "MAL",
  matthew: "MAT", mark: "MRK", luke: "LUK", john: "JHN", acts: "ACT",
  romans: "ROM", "1 corinthians": "1CO", "2 corinthians": "2CO", galatians: "GAL",
  ephesians: "EPH", philippians: "PHP", colossians: "COL", "1 thessalonians": "1TH",
  "2 thessalonians": "2TH", "1 timothy": "1TI", "2 timothy": "2TI", titus: "TIT",
  philemon: "PHM", hebrews: "HEB", james: "JAS", "1 peter": "1PE", "2 peter": "2PE",
  "1 john": "1JN", "2 john": "2JN", "3 john": "3JN", jude: "JUD", revelation: "REV",
};

function normalizeBookName(name: string): string | null {
  const lower = name.toLowerCase().trim();
  return BOOK_NAME_TO_USFM[lower] || null;
}

/* ── Chunk text into ~600 token pieces ── */
function chunkText(text: string, maxChars = 2400): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if ((current + " " + sentence).length > maxChars && current.length > 0) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += (current ? " " : "") + sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

/* ── Parse OSIS XML commentary sections ── */
function parseOSISCommentary(xmlText: string): Array<{ bookName: string; chapter: number; content: string }> {
  const entries: Array<{ bookName: string; chapter: number; content: string }> = [];
  
  // Match <div> sections with osisID attributes like "Gen.1" or commentary sections
  const divPattern = /<div[^>]*osisID="([^"]+)"[^>]*>([\s\S]*?)<\/div>/gi;
  let match;
  
  while ((match = divPattern.exec(xmlText)) !== null) {
    const osisId = match[1];
    let content = match[2];
    
    // Strip XML tags, keep text
    content = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (content.length < 50) continue;
    
    // Parse osisID like "Gen.1" or "Matt.5"
    const idParts = osisId.split(".");
    if (idParts.length >= 2) {
      const bookName = idParts[0];
      const chapter = parseInt(idParts[1], 10);
      if (!isNaN(chapter)) {
        entries.push({ bookName, chapter, content });
      }
    }
  }
  
  return entries;
}

/* ── Parse JSON commentary format ── */
function parseJSONCommentary(jsonText: string): Array<{ bookName: string; chapter: number; content: string }> {
  const entries: Array<{ bookName: string; chapter: number; content: string }> = [];
  
  try {
    const data = JSON.parse(jsonText);
    
    // Handle various JSON structures
    if (Array.isArray(data)) {
      for (const item of data) {
        if (item.book && item.chapter && item.text) {
          entries.push({
            bookName: item.book,
            chapter: typeof item.chapter === "string" ? parseInt(item.chapter, 10) : item.chapter,
            content: item.text,
          });
        }
      }
    } else if (typeof data === "object") {
      // Handle nested book->chapter structure
      for (const [bookKey, chapters] of Object.entries(data)) {
        if (typeof chapters === "object" && chapters !== null) {
          for (const [chapKey, text] of Object.entries(chapters as Record<string, unknown>)) {
            const chapNum = parseInt(chapKey, 10);
            if (!isNaN(chapNum) && typeof text === "string" && text.length > 50) {
              entries.push({ bookName: bookKey, chapter: chapNum, content: text });
            }
          }
        }
      }
    }
  } catch (e) {
    console.error("JSON parse error:", e);
  }
  
  return entries;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Admin auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role using security definer function
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { source_url, book_title, author, format } = await req.json();

    if (!source_url || !book_title || !author || !format) {
      return new Response(JSON.stringify({ error: "Missing required fields: source_url, book_title, author, format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch raw commentary data
    console.log(`Fetching commentary from: ${source_url}`);
    const rawResp = await fetch(source_url);
    if (!rawResp.ok) {
      return new Response(JSON.stringify({ error: `Failed to fetch source: ${rawResp.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawText = await rawResp.text();
    console.log(`Fetched ${rawText.length} chars`);

    // Parse based on format
    let sections: Array<{ bookName: string; chapter: number; content: string }>;
    if (format === "osis_xml") {
      sections = parseOSISCommentary(rawText);
    } else if (format === "json") {
      sections = parseJSONCommentary(rawText);
    } else {
      return new Response(JSON.stringify({ error: "Unsupported format. Use 'json' or 'osis_xml'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Parsed ${sections.length} commentary sections`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let inserted = 0;
    let errors = 0;
    let tocInserted = 0;

    // Process in batches of 50
    const BATCH_SIZE = 50;
    for (let i = 0; i < sections.length; i += BATCH_SIZE) {
      const batch = sections.slice(i, i + BATCH_SIZE);
      
      for (const section of batch) {
        try {
          // Resolve USFM code
          const usfm = normalizeBookName(section.bookName);
          if (!usfm) {
            console.warn(`Unknown book name: ${section.bookName}`);
            errors++;
            continue;
          }

          // Chunk the content
          const chunks = chunkText(section.content);

          for (const chunk of chunks) {
            // Generate embedding if API key available
            let embedding: number[] | null = null;
            if (LOVABLE_API_KEY) {
              try {
                const embRes = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${LOVABLE_API_KEY}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    model: "text-embedding-3-small",
                    input: chunk.slice(0, 4000),
                  }),
                });

                if (embRes.ok) {
                  const embData = await embRes.json();
                  embedding = embData?.data?.[0]?.embedding ?? null;
                }
              } catch (e) {
                console.warn("Embedding error:", e);
              }
            }

            // Insert chunk
            const { error: insertError } = await supabaseAdmin
              .from("library_chunks")
              .insert({
                book_title,
                author,
                content: chunk,
                embedding: embedding ? `[${embedding.join(",")}]` : null,
                page_reference: `${section.bookName} ${section.chapter}`,
                bible_book_usfm: usfm,
                chapter_number: section.chapter,
                source_url,
              });

            if (insertError) {
              console.error("Insert error:", insertError);
              errors++;
            } else {
              inserted++;
            }
          }

          // Insert/update TOC entry for this chapter
          const { error: tocError } = await supabaseAdmin
            .from("library_toc")
            .upsert(
              {
                bible_book_usfm: usfm,
                book_title,
                author,
                chapter_start: section.chapter,
                chapter_end: section.chapter,
                section_title: `${section.bookName} ${section.chapter}`,
                content_summary: section.content.slice(0, 500),
              },
              { onConflict: "bible_book_usfm,chapter_start,book_title" }
            );

          if (!tocError) tocInserted++;
        } catch (e) {
          console.error("Section processing error:", e);
          errors++;
        }
      }

      console.log(`Processed batch ${Math.floor(i / BATCH_SIZE) + 1}: ${inserted} chunks inserted, ${errors} errors`);
    }

    return new Response(
      JSON.stringify({ inserted, errors, tocInserted, totalSections: sections.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ingest-commentary error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
