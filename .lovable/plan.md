

# Bible Reader: 4-Phase Build Plan

## Overview
Build a custom Bible reader powered by the YouVersion REST API, routed through a caching edge function to avoid CORS and rate limits. Executed in 4 sequential phases with verification gates.

---

## Phase 1: Database Caching Infrastructure

**Create `bible_cache` table via migration:**

```sql
CREATE TABLE public.bible_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_path text UNIQUE NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bible_cache_request_path ON public.bible_cache (request_path);

ALTER TABLE public.bible_cache ENABLE ROW LEVEL SECURITY;

-- Allow edge function (service role) full access; no client access needed
CREATE POLICY "Service role manages bible cache"
  ON public.bible_cache FOR ALL
  USING (auth.role() = 'service_role'::text);
```

This will be executed using the database migration tool. No dashboard access needed — Lovable Cloud handles it.

**Stop point:** Confirm migration deployed before Phase 2.

---

## Phase 2: Edge Function — `youversion-proxy`

**File:** `supabase/functions/youversion-proxy/index.ts`

- Accepts `{ endpoint: string }` in POST body
- Validates input (must start with `/`)
- Initializes Supabase client with `SUPABASE_SERVICE_ROLE_KEY`
- DaaC logic:
  1. Query `bible_cache` WHERE `request_path = endpoint`
  2. **HIT** → return `payload` with `X-Cache: HIT` header
  3. **MISS** → fetch `https://api.youversion.com/v1${endpoint}` with `X-YVP-App-Key` header
  4. Insert response into `bible_cache`
  5. Return with `X-Cache: MISS` header
- Full CORS support
- Input validation with path whitelist pattern (only `/bible/` paths)

**Secret needed:** `YVP_APP_KEY` — the YouVersion API key. The `VITE_YOUVERSION_APP_KEY` secret already exists but is a build-time secret. We'll need a runtime secret named `YVP_APP_KEY` for the edge function (or reuse the existing one if it's also set as a runtime secret).

**Stop point:** Confirm function deployed and secret set before Phase 3.

---

## Phase 3: Client-Side Fetching & State

**File:** `src/hooks/useBibleReader.ts`

- Create a `fetchBible(endpoint: string)` utility using `supabase.functions.invoke('youversion-proxy', { body: { endpoint } })`
- Build a `useBibleChapter(versionId, bookUsfm, chapterNumber)` hook using `@tanstack/react-query` (already installed):
  - Constructs endpoint: `/bible/chapter/${versionId}/${bookUsfm}.${chapterNumber}`
  - Returns `{ data, isLoading, error }` with proper cache keys
  - `staleTime: Infinity` since Bible content is immutable
- AbortController support comes free via React Query

**Stop point:** Confirm hook works before Phase 4.

---

## Phase 4: UI — `<BibleReader />`

**File:** `src/components/bible/BibleReader.tsx`

- Consumes `useBibleChapter` hook
- Semantic HTML: `<article>` container, `<section>` for blocks, `<sup>` for verse numbers
- Tailwind typography with `max-w-prose`, responsive font sizing
- Toggle between two modes:
  - **Verse-by-Verse:** each verse as a `<p>` on its own line
  - **Paragraph:** inline `<span>` elements within paragraph blocks
- Loading skeleton and error states
- Selectors for version, book, and chapter (basic `<Select>` dropdowns)

**File:** `src/pages/Bible.tsx` — page wrapper with route `/bible`

**Route addition** in `src/App.tsx`

---

## Technical Details

| Concern | Approach |
|---|---|
| CORS | Edge function with standard CORS headers |
| API key security | `YVP_APP_KEY` stored as runtime secret, never sent to client |
| Rate limiting | Postgres cache with UNIQUE constraint on `request_path` — each path fetched once |
| Cache invalidation | Not needed for immutable Bible content; optional TTL can be added later |
| RLS | Service-role-only policy on `bible_cache` |
| State management | React Query with `staleTime: Infinity` |

