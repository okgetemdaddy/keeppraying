

# Fix AI-Powered Bible Search (500 Error)

## The Problem

The Bible search is already AI-powered — the `bible-search` edge function calls an AI model to interpret topic queries like "what does the Bible say about worry?" and return relevant passages. But it's returning 500 errors because it's hitting the **wrong API endpoint**.

Current (broken): `https://ai.lovable.dev/api/generate`
Correct: `https://ai.gateway.lovable.dev/v1/chat/completions`

## Changes

### `supabase/functions/bible-search/index.ts`

1. **Fix the API URL** — change `https://ai.lovable.dev/api/generate` to `https://ai.gateway.lovable.dev/v1/chat/completions`
2. **Update the response parsing** — the gateway returns standard OpenAI-format responses, so the existing `aiData.choices?.[0]?.message?.content` parsing should work, but verify the model field uses a valid model name (switch from `google/gemini-2.5-flash` to `google/gemini-3-flash-preview` for the latest default)
3. **Add 429/402 error handling** — surface rate limit and payment errors gracefully instead of returning a generic 500

Once deployed, typing "what does the Bible say about worry?" will return AI-suggested passages like Matthew 6:25-34, Philippians 4:6-7, and 1 Peter 5:7.

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/bible-search/index.ts` | Fix gateway URL, update model, add rate-limit error handling |

