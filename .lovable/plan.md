

## Two-Phase Sermon Analysis: Save Raw AI Response, Then Parse for UI

### Problem
Currently, the edge function forces Grok to return structured JSON directly. Grok is a reasoning model — it's better at natural language analysis than rigid JSON output. This causes refusals ("I cannot...") and malformed JSON. The user wants Grok to do what it does best (analyze the sermon freely), save that raw response, then use a second AI pass to extract the structured data the UI needs.

### Architecture

```text
Phase 1: Grok analyzes sermon → raw text saved to DB
Phase 2: Gemini reads raw text → extracts structured JSON → returned to frontend
```

### Plan

**1. Add `raw_ai_response` column to `sermon_transcripts` table**
- New nullable text column to store Grok's full natural-language sermon breakdown
- Migration: `ALTER TABLE sermon_transcripts ADD COLUMN raw_ai_response text;`

**2. Update Premium Prompt (remove JSON requirement)**
- Remove the entire JSON schema instruction from `PREMIUM_PROMPT`
- Let Grok respond naturally with its full detailed sermon analysis (timestamps, subtopics, illustrations, applications, daily prayers, service outline)
- Keep the instruction to analyze the full video, use real Scripture, derive everything from the sermon

**3. Change premium flow in `sermon-sync/index.ts` to two phases**

Phase 1 — Grok call:
- Send the natural-language prompt to Grok
- Check for refusal
- Save raw response text to `sermon_transcripts.raw_ai_response`
- Save video metadata (title extracted from response if possible)

Phase 2 — Gemini extraction call:
- Send the saved raw text to Gemini (via Lovable AI gateway) with a structured extraction prompt:
  *"Extract the following JSON structure from this sermon analysis..."* (with the existing JSON schema)
- Parse the JSON response
- Save to `premium_result` as before
- Return to frontend

**4. Update cache logic**
- When checking cache, still check `premium_result` first (if populated, return it)
- If `raw_ai_response` exists but `premium_result` is null, re-run Phase 2 only (skip the Grok call)
- This means clearing `premium_result` in admin triggers a re-parse without re-calling Grok

**5. Frontend — no changes needed**
- The frontend still receives the same `PremiumResult` JSON shape
- All existing UI components continue working unchanged

### Files Changed
- `supabase/functions/sermon-sync/index.ts` — two-phase flow, updated prompt, Gemini extraction step
- One database migration — add `raw_ai_response` column

### Technical Details

The Gemini extraction prompt will be something like:
```
Extract structured data from this sermon analysis into valid JSON. 
Do not add information — only extract what is present.
{schema here}
```

This uses `google/gemini-2.5-flash` (already used for standard mode) — fast, cheap, excellent at structured extraction from text. Grok handles the hard part (watching/analyzing the video), Gemini handles the easy part (formatting into JSON).

