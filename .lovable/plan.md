

## Code Audit, Bug Fixes, and /Fruit Inspector Page

### Phase 1: Bug Fixes (Critical)

**1. `bible-sight-chat/index.ts` — Auth method does not exist**
Line 55 calls `supabase.auth.getClaims(token)` which is not a real Supabase JS method. This will throw at runtime, making Bible Sight chat completely non-functional.

Fix: Replace with the standard `getUser()` pattern used in every other edge function (e.g. `commentary-search`, `ingest-commentary`).

**2. `ingest-commentary/index.ts` — Admin role check uses `profiles.role` instead of `has_role()`**
Line 154-165 queries `profiles.role` directly, bypassing the security definer `has_role()` function that's the project standard (per RBAC memory). This is both a security concern and an inconsistency.

Fix: Use `has_role()` RPC for admin verification, matching the project's RBAC pattern.

**3. `bible-sight-chat/index.ts` — Auth token used for library queries is anon-scoped**
Lines 75-81 and 101-108 query `library_toc` and `library_chunks` using the user-scoped anon client, which is subject to RLS. If these tables don't have permissive read policies, the queries silently return empty. Should use a service-role client for internal library lookups.

Fix: Create a separate service-role client for library data fetches.

**4. Commentary Drawer — `hostAvailability` query fetches ALL rows per book**
Line 178 selects `author, chapter_number` from `library_chunks` for an entire book with no limit, which could return thousands of rows. Add `.limit(1000)` or use a `COUNT` aggregate.

---

### Phase 2: Database Migration — `fruit_reports` table

New table to persist generated reports for the /Fruit page:

```sql
CREATE TABLE public.fruit_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_used text NOT NULL,
  report_content text NOT NULL,
  chat_log jsonb DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fruit_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own reports"
  ON public.fruit_reports FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

---

### Phase 3: New Edge Function — `fruit-report`

**`supabase/functions/fruit-report/index.ts`**

- Accepts `{ model, chat_messages? }` + auth JWT
- Validates user email is `jwlesley@gmail.com` (hard gate)
- Queries the full project state:
  - `library_chunks`: counts per author, per book
  - `bible_sight_entries`: recent sessions and journals
  - `commentary_bookmarks`: total count
  - `enriched_chapters`: coverage stats
  - `profiles`: total users
- Constructs a comprehensive prompt asking the specified model to generate the full report (features from last 2 days, all /bible features, UX audit, mission inference, trajectory, suggestions)
- If `chat_messages` provided, runs as a follow-up chat with the same model
- Returns streamed response
- Models:
  - "home" tab: `google/gemini-3-flash-preview` (default fast model)
  - "grok" tab: Grok 4.20 via `api.x.ai` with `grok-4.20-0309-reasoning`
  - "gemini" tab: `google/gemini-2.5-pro` via Lovable AI Gateway

---

### Phase 4: New Page — `/Fruit`

**`src/pages/Fruit.tsx`**

Access-gated page (only `jwlesley@gmail.com` via `useAuth()` check — redirects others to `/bible`).

**Layout:**
- Full-height page with KeepRead.ing nav
- Three tabs: "Fruit" (home), "Grok 4.20 Reasoning", "Gemini 2.5 Pro"
- Each tab shares the same structure:

**Tab content:**
- **Report area**: Rendered with `react-markdown` and `renderWithVerseLinks`, warm serif typography matching Commentary Drawer design language
- **Refresh button**: Generates a new full report from that tab's model (streamed, token-by-token)
- **Past reports sidebar**: Collapsible list of previous generations (date + time), clickable to view
- **Chat bar at bottom**: Interact with the specific model that created the current report (conversation stored in `fruit_reports.chat_log`)

**Report prompt includes:**
- Complete feature inventory of `/bible` (BibleReader, BibleSight, Commentary Library, Deep Study, Canvas Studio, Margin Study, Journal, Ink Overlay, Verse Bunches, Bookmarks, Cross-References, Search, TTS, Zoom, Focus Mode, etc.)
- Features added in last 48 hours (Commentary Library, BibleSightDrawer, Commentary Search, Go Deeper handoff, Commentary Bookmarks, public study sessions, private chat logs, `ingest-commentary` function)
- Database stats from live queries
- UX audit: design language consistency, dark/light mode, serif vs sans choices, spacing, animation, accessibility
- Mission/purpose inference from the product
- Improvement suggestions with prioritization
- Each feature title is a clickable expandable section

**Feature detail sections:**
- Clicking a feature title expands to show: description, files involved, edge functions, database tables, what could be missed or lost during pivots

**"Missed or Lost" section:**
- Cross-references conversation history (the report model is asked to identify features discussed but possibly incomplete)

---

### Phase 5: Route Wiring

**`src/App.tsx`**: Add route for `/Fruit` (under the main `AppShell`):
```
<Route path="/Fruit" element={<Fruit />} />
```

Also add it to `KeepReadingShell.tsx` so it works on keepread.ing domain too.

Lazy-load `Fruit` page since it's admin-only.

---

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/bible-sight-chat/index.ts` | Fix `getClaims` → `getUser()`, add service-role client for library queries |
| `supabase/functions/ingest-commentary/index.ts` | Use `has_role()` for admin check |
| `src/components/bible/CommentaryDrawer.tsx` | Add limit to hostAvailability query |
| **Migration** | Create `fruit_reports` table with RLS |
| `supabase/functions/fruit-report/index.ts` | New: multi-model report generation + chat |
| `src/pages/Fruit.tsx` | New: 3-tab report dashboard with chat, history, feature drill-down |
| `src/App.tsx` | Add `/Fruit` route |
| `src/components/keepreading/KeepReadingShell.tsx` | Add `/Fruit` route |

