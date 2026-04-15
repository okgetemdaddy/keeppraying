

## Switch refine-voice-prayer to Grok 4.20 Fast Reasoning

### Change — `supabase/functions/refine-voice-prayer/index.ts`

Replace the Lovable AI gateway call with the Grok API (`api.x.ai`):

- **API endpoint**: `https://api.x.ai/v1/chat/completions`
- **Auth**: `GROK_API_KEY` (already configured) instead of `LOVABLE_API_KEY`
- **Model**: `grok-4.20-0309-reasoning`
- **Remove** `response_format: { type: "json_object" }` (Grok handles JSON via the system prompt)
- **Add** `temperature: 0.4` for consistent refinement output
- Keep the same system prompt, same fallback logic, same CORS headers
- No other files change

