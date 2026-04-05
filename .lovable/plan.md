

## Multi-Model Fan-Out for summarize-session Edge Function

### Architecture

```text
Session Events
    ├──→ Gemini 2.5 Pro  (theological lens)    ──┐
    ├──→ GPT-5 Nano      (statistical lens)     ──┤  via Lovable AI Gateway
    ├──→ GPT-5 Mini      (behavioral lens)      ──┤
    │                                              │
    │    Promise.allSettled (parallel)              │
    │                                              ▼
    └──→ Grok 4 (synthesis) ← all 3 outputs + raw events  (via api.x.ai)
             │
             ▼
         Final SessionSummary → study_sessions.session_summary
```

### Key Design Decision: API Routing

GPT-5 Nano, GPT-5 Mini, and Gemini 2.5 Pro all route through the **Lovable AI Gateway** (`https://ai.gateway.lovable.dev/v1/chat/completions`) using the existing `LOVABLE_API_KEY`. This avoids needing separate OpenAI or Google API keys. Only the Grok 4 synthesis call uses the existing `GROK_API_KEY` via `api.x.ai`.

No new secrets needed — `LOVABLE_API_KEY` and `GROK_API_KEY` are both already configured.

### File 1: `supabase/functions/summarize-session/index.ts` (Rewrite)

- Keep existing auth, ownership verification, event fetching, and fallback logic
- Replace single Grok call (lines 110-177) with:
  - Three parallel fan-out functions calling Lovable AI Gateway with different models/system prompts
  - `Promise.allSettled` to run all three in parallel
  - Grok 4 synthesis call that receives all three analyses + raw session data
  - Graceful degradation: if fan-out models fail, synthesis works with what's available; if synthesis fails, use best individual analysis; if everything fails, use existing `buildFallbackSummary`
- Update `SessionSummary` interface to include optional `model_contributions` and `_raw_analyses` fields
- Update CORS headers to include newer Supabase client headers

### File 2: `src/components/bible/SessionDetailDashboard.tsx` (Edit)

- Update `SessionSummary` interface to add `model_contributions` and `_raw_analyses`
- Add collapsible "Model Perspectives" section inside `AISynthesisModule` (after tags), shown only when `model_contributions` exists
- Uses existing `Collapsible` component and `ChevronDown` icon (already imported)
- Color-coded labels: amber for theological, sky for statistical, emerald for behavioral

### Summary

| Item | Action |
|------|--------|
| `summarize-session/index.ts` | Rewrite AI section with 3-model fan-out + Grok synthesis |
| `SessionDetailDashboard.tsx` | Add model perspectives collapsible to Module 2 |
| New secrets | None needed |

