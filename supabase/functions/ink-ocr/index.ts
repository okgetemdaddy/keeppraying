import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { strokes, verseContext } = await req.json();

    if (!strokes || !Array.isArray(strokes) || strokes.length === 0) {
      return new Response(
        JSON.stringify({ error: "No stroke data provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build a text description of the strokes for the AI to interpret
    const strokeDescriptions = strokes.map((s: any, i: number) => {
      const points = s.points || [];
      const bbox = {
        minX: Math.min(...points.map((p: any) => p.x)),
        maxX: Math.max(...points.map((p: any) => p.x)),
        minY: Math.min(...points.map((p: any) => p.y)),
        maxY: Math.max(...points.map((p: any) => p.y)),
      };
      return `Stroke ${i + 1}: ${points.length} points, bounding box (${bbox.minX.toFixed(0)},${bbox.minY.toFixed(0)}) to (${bbox.maxX.toFixed(0)},${bbox.maxY.toFixed(0)})`;
    });

    // Serialize stroke point data for the model
    const strokeData = strokes.map((s: any) => ({
      points: (s.points || []).map((p: any) => [
        Math.round(p.x * 10) / 10,
        Math.round(p.y * 10) / 10,
      ]),
    }));

    const systemPrompt = `You are a handwriting recognition expert. The user has drawn strokes on a Bible study page using a stylus. 
Each stroke is represented as a series of (x, y) coordinate pairs forming handwritten text.
Your task is to interpret these strokes and return the most likely text that was written.

Context: The user is studying the Bible and may be writing notes, verse references, reflections, or key words related to the scripture.
${verseContext ? `The user is currently reading: ${verseContext}` : ""}

Rules:
- Return ONLY the recognized text, no explanations
- If you cannot confidently recognize any text, return "[unreadable]"
- Common writings include: verse references (e.g. "John 3:16"), key words, short reflections, arrows/underlines (return "[mark]" for these)
- Preserve line breaks if the strokes suggest multiple lines`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Please recognize the handwriting from these ${strokes.length} stroke(s):\n\n${JSON.stringify(strokeData)}\n\nStroke summary:\n${strokeDescriptions.join("\n")}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI processing error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const result = await response.json();
    const recognizedText = result.choices?.[0]?.message?.content?.trim() ?? "[unreadable]";

    return new Response(
      JSON.stringify({ text: recognizedText }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("ink-ocr error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
