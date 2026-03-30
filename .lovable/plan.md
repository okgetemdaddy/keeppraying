

## Update Grok Model to Latest Version

The uploaded screenshot from the xAI console shows the latest model identifier is **`grok-4.20-0309-reasoning`**. All 6 edge functions currently reference the older `grok-4.20-reasoning` identifier.

### Changes

**Update model string in all 6 edge functions:**

| File | Current | New |
|------|---------|-----|
| `supabase/functions/sermon-sync/index.ts` | `grok-4.20-reasoning` | `grok-4.20-0309-reasoning` |
| `supabase/functions/verse-summary/index.ts` | `grok-4.20-reasoning` | `grok-4.20-0309-reasoning` |
| `supabase/functions/craft-prayer/index.ts` | `grok-4.20-reasoning` | `grok-4.20-0309-reasoning` |
| `supabase/functions/scrape-church-info/index.ts` | `grok-4.20-reasoning` | `grok-4.20-0309-reasoning` |
| `supabase/functions/sermon-generate-prayer/index.ts` | `grok-4.20-reasoning` | `grok-4.20-0309-reasoning` |
| `supabase/functions/refresh-verse-summaries/index.ts` | `grok-4.20-reasoning` | `grok-4.20-0309-reasoning` (2 occurrences) |

Each is a single-line string replacement. All 6 functions will be redeployed after the update.

