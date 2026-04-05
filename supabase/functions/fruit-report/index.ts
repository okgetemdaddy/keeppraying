import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FEATURE_INVENTORY = `
## Complete /bible Feature Inventory (KeepRead.ing)

### Core Reading Experience
- **BibleReader**: Full chapter reading with verse-by-verse rendering, multiple translations via YouVersion proxy, touch-optimized scrolling
- **Bible Search**: Global search across Scripture with verse reference parsing and semantic search
- **Bible Position Sync**: Cross-device reading position sync (book, chapter, scroll position) stored in bible_reading_position
- **Text Size Control**: User-adjustable Bible text sizing persisted in board_preferences
- **Chapter Navigation**: Thumbnail strip for quick chapter browsing within a book
- **Focus/Immersive Mode**: Distraction-free reading with ambient backgrounds and atmospheric audio

### Bible Sight Study System
- **Bible Sight Chat (Conversational)**: 80% height chat drawer powered by Grok 4.20 reasoning. Scholarly companion that helps narrow study topics before generating full sessions. Uses RAG pipeline (library_toc + library_chunks). Persona: humble believer, "I do this for HIS glory"
- **Deep Study (AutoEnrich)**: Dual-pass exegesis — Primary Pass (Grok) for core IVP Commentary analysis, Secondary Pass (Gemini 2.5 Pro) for supplementary word studies. Results cached in enriched_chapters
- **Study Sessions**: Public, searchable study sessions stored in bible_sight_entries. 3-dot menu for sharing to Circles/Family Rooms. Private chat logs visible only to creator
- **Journal Entries**: Personal spiritual reflections generated from chapter context, stored in bible_sight_entries with entry_type='journal'
- **Session Detail Dashboard**: Full session viewer with magazine-style typography, ornamental dividers

### Commentary Library (Added in last 48 hours)
- **Commentary Drawer**: 6-host classical commentary system (Matthew Henry, Albert Barnes, John Calvin, John Wesley, Jamieson-Fausset-Brown, Keil & Delitzsch)
- **Commentary Search**: GPT-5 powered semantic search across all commentary library_chunks with relevance ranking
- **Go Deeper Integration**: One-click handoff from commentary to Bible Sight chat with pre-seeded context
- **Commentary Bookmarks**: Unlimited personal bookmarks with AI-generated titles, inline editing, date-grouped collapsible panel
- **Commentary Ingestion**: Admin edge function (ingest-commentary) for bulk importing classical works with chapter mapping

### Annotation & Ink System
- **Ink Overlay**: Apple Pencil-optimized freehand annotation directly on Scripture text
- **Margin Annotation Layer**: Typed and handwritten margin notes tied to specific verses
- **Handwriting Engine**: Pressure-sensitive ink rendering with multiple pen types
- **Ink History**: Undo/redo with full stroke history
- **Ink Trash Sheet**: Recover deleted annotations
- **Pencil Detection**: Auto-detects Apple Pencil connection and shows configuration sheet
- **Cross-Translation Annotations**: Annotations visible across different Bible translations

### Canvas Studio
- **Manuscript Canvas**: Full paper-like canvas for extended Bible study notes
- **Paper Canvas**: Simulated paper texture with zoom/pan
- **Canvas Creation Drawer**: Tools for creating visual study layouts
- **Canvas Export**: Export study canvases as shareable images
- **Zoom/Pan Wrapper**: Smooth pinch-to-zoom and pan navigation

### Verse Organization
- **Verse Bunches**: Group and tag related verses with color-coded collections
- **Verse Bunch Dialog/Strip**: Visual bunch management and inline display
- **Selected Verses Strip**: Multi-verse selection UI with action toolbar
- **Cross-Reference Popover**: Interactive cross-reference exploration from any verse

### Study Tools
- **Word Study**: Deep word-level analysis with original language insights
- **Floating Toolbar**: Context-sensitive toolbar appearing on verse selection
- **Mobile Study Toolbar**: Touch-optimized study tools for phone screens
- **iPad Study Toolbar**: Enhanced toolbar layout for tablet experience
- **Studio Toolbar**: Full-featured creative studio tools (ink, highlight, annotate)
- **Bento Expansion Panel**: Expandable tool panel with categorized study actions

### Audio & TTS
- **TTS Player**: Text-to-speech for Scripture reading with configurable voices
- **TTS Contemplation Overlay**: Meditative listening mode with visual effects
- **Voice Annotation Overlay**: Record voice notes attached to specific verses
- **Ambient Audio Player**: Background atmospheric sounds for immersive reading

### Navigation & UX
- **Bible Edge Tabs**: Quick-access edge tabs for switching between study tools
- **Bible Pocket Sheet**: Slide-up sheet for saved verses and quick access
- **Bible Sleeve Sheet**: Expandable sleeve for extended study tools
- **Bible Suggestion Sheet**: Contextual reading suggestions
- **Gesture Education Overlay**: First-time user guidance for touch gestures
- **How-To Guide**: In-app study methodology guide
- **Session Linger Toast**: "Continue where you left off" prompt
- **Resume or New Sheet**: Choice between resuming last session or starting fresh

### Sharing & Export
- **Share Content Modal**: Share verses, notes, or study sessions
- **Bible Search Dialog**: Full-featured search with filters

### Premium Features
- **Premium Upsell Sheet**: Feature gating for premium study tools
- **iPad Waitlist Drawer**: Waitlist signup for iPad-specific features

## Features Added in Last 48 Hours
1. Commentary Library — 6-host classical commentary system with drawer UI
2. Bible Sight Chat Drawer — Conversational study companion with Grok 4.20
3. Commentary Search — GPT-5 semantic search across commentary chunks
4. Go Deeper Handoff — Commentary → Bible Sight seamless transition with context
5. Commentary Bookmarks — Unlimited bookmarks with AI titles, inline editing
6. Public Study Sessions — Sessions searchable globally, chat logs private
7. Ingest Commentary Edge Function — Admin bulk import for classical works
8. Deep Study Secondary Pass — Gemini 2.5 Pro supplementary analysis
9. Session Detail Dashboard — Magazine-style full session viewer
10. Commentary Host Availability — Real-time chapter coverage indicators per commentator
`;

const REPORT_PROMPT = `You are a Senior Web Development Designer and Expert UX Professional conducting a comprehensive product audit of KeepRead.ing — a sacred digital Bible study platform.

Generate a thorough, professional report covering ALL of the following sections. Use markdown formatting with clear headers, bullet points, and visual emphasis where appropriate.

## REPORT SECTIONS REQUIRED:

### 1. 📊 48-Hour Feature Log
List every feature added or significantly updated in the last 48 hours with brief descriptions. Use the feature inventory provided.

### 2. 📖 Complete /bible Feature Registry
Organize ALL current features into logical categories. Each feature title should be formatted as a **bold clickable header**. Under each, note: purpose, key files, database tables involved, and current status.

### 3. 🎨 Design Language & Uniformity Audit
Evaluate: color palette consistency, typography choices (serif vs sans-serif), spacing systems, dark/light mode implementation, animation patterns, icon consistency, mobile vs desktop layouts. Rate each area 1-10.

### 4. 🧭 Trajectory Analysis
Based on the feature set, growth patterns, and architectural decisions, where is this product heading? What market position is it carving out? Compare to competitors (YouVersion, Logos, Olive Tree).

### 5. 🏛️ Inferred Mission & Purpose Statement
Based purely on examining the product's features, design choices, and user flows — what would one reasonably conclude the mission and purpose statement is? Write it formally.

### 6. 🔍 UX Deep Dive
- Information architecture assessment
- User flow analysis (new user → power user journey)
- Accessibility considerations
- Performance concerns
- Mobile-first evaluation
- Touch interaction quality

### 7. 💡 Enhancement Recommendations
Prioritized list of improvements across: UI polish, missing features, performance optimizations, UX friction points, design system gaps. Use priority labels: 🔴 Critical, 🟡 Important, 🟢 Nice-to-have.

### 8. ⚠️ Missed or Lost Features
Identify any features that appear partially implemented, discussed but incomplete, or architecturally prepared for but not yet wired up. These are features where the database tables or edge functions exist but the UI may be missing or vice versa.

### 9. 📈 Scorecard
Give an overall product score across these dimensions (1-10 each):
- Visual Design
- UX/Usability
- Feature Completeness
- Code Architecture
- Mobile Experience
- Innovation
- Spiritual Sensitivity

DATABASE STATISTICS:
{DB_STATS}

${FEATURE_INVENTORY}

Be thorough, honest, and constructive. This is an internal product audit — candor is valued over politeness.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Hard gate: only jwlesley@gmail.com
    if (user.email !== "jwlesley@gmail.com") {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { model, chat_messages } = await req.json();

    // Gather database stats
    const [
      { count: chunkCount },
      { count: tocCount },
      { count: enrichedCount },
      { count: sightCount },
      { count: profileCount },
      { count: bookmarkCount },
      { data: chunkAuthors },
      { data: recentSessions },
    ] = await Promise.all([
      supabaseAdmin.from("library_chunks").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("library_toc").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("enriched_chapters").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("bible_sight_entries").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("commentary_bookmarks").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("library_chunks").select("author").not("author", "is", null).limit(500),
      supabaseAdmin.from("bible_sight_entries").select("entry_type, created_at, lens_used").order("created_at", { ascending: false }).limit(20),
    ]);

    // Count unique authors
    const uniqueAuthors = new Set(chunkAuthors?.map((c: any) => c.author) ?? []);

    const dbStats = `
- Library Chunks: ${chunkCount ?? 0} total
- Library TOC Entries: ${tocCount ?? 0}
- Unique Commentary Authors: ${uniqueAuthors.size} (${[...uniqueAuthors].join(", ")})
- Enriched Chapters (Deep Study cache): ${enrichedCount ?? 0}
- Bible Sight Entries (sessions + journals): ${sightCount ?? 0}
- Commentary Bookmarks: ${bookmarkCount ?? 0}
- Total User Profiles: ${profileCount ?? 0}
- Recent Sessions: ${JSON.stringify(recentSessions?.slice(0, 5) ?? [])}
`;

    // Determine which model/API to use
    const isChat = chat_messages && chat_messages.length > 0;
    const systemPrompt = isChat
      ? "You are the Fruit Inspector — an expert web development and UX analyst for KeepRead.ing. Continue the conversation about the product report. Be thorough and insightful."
      : REPORT_PROMPT.replace("{DB_STATS}", dbStats);

    const messages = isChat
      ? [{ role: "system", content: systemPrompt }, ...chat_messages]
      : [{ role: "system", content: systemPrompt }, { role: "user", content: "Generate the full product audit report now. Be comprehensive and include all sections." }];

    let apiUrl: string;
    let apiHeaders: Record<string, string>;
    let body: Record<string, any>;

    if (model === "grok") {
      // Grok 4.20 reasoning via x.ai
      const GROK_API_KEY = Deno.env.get("GROK_API_KEY");
      if (!GROK_API_KEY) {
        return new Response(JSON.stringify({ error: "Grok API key not configured" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      apiUrl = "https://api.x.ai/v1/chat/completions";
      apiHeaders = {
        Authorization: `Bearer ${GROK_API_KEY}`,
        "Content-Type": "application/json",
      };
      body = {
        model: "grok-4-0709",
        messages,
        temperature: 0.7,
        max_tokens: 4000,
        stream: true,
      };
    } else if (model === "gemini") {
      // Gemini 2.5 Pro via Lovable AI Gateway
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        return new Response(JSON.stringify({ error: "Lovable API key not configured" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      apiUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";
      apiHeaders = {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      };
      body = {
        model: "google/gemini-2.5-pro",
        messages,
        stream: true,
      };
    } else {
      // Default "home" tab: Gemini 3 Flash via Lovable AI Gateway
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        return new Response(JSON.stringify({ error: "Lovable API key not configured" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      apiUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";
      apiHeaders = {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      };
      body = {
        model: "google/gemini-3-flash-preview",
        messages,
        stream: true,
      };
    }

    const aiResponse = await fetch(apiUrl, {
      method: "POST",
      headers: apiHeaders,
      body: JSON.stringify(body),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);

      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited — please try again in a moment" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted — please add funds in Settings > Workspace > Usage" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Report generation temporarily unavailable" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(aiResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("fruit-report error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
