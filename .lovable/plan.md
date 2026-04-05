

## Updated Plan: Auto-Labeling + Journal Search

Two additions to the approved Bible Sight plan:

### 1. Auto-Label All Generated Journal Entries

Every journal entry created by Bible Sight gets metadata columns stored in the `bible_sight_entries` table (already planned). These labels are **never shown to the user** — they exist purely for admin search and the Bible Pocket search tab.

**Labels auto-generated per entry** (set by the `generate-journal` edge function alongside the content):

| Field | Source | Example |
|-------|--------|---------|
| `lens_used` | Already planned | "worry_and_peace" |
| `tags` | Extracted by the LLM in the same call (add to output schema) | `["repentance", "baptism", "john-the-baptist", "metanoia"]` |
| `book_usfm` / `chapter_number` | Already planned | "MAT" / 3 |
| `summary_line` | One-line summary from LLM | "Finding peace through John's call to repentance" |

The `generate-journal` edge function prompt adds one extra instruction: "Also output a `tags` array (3-6 lowercase theological/topical keywords) and a `summary_line` (one sentence, max 80 chars)."

**Migration change**: Add `tags text[]` and `summary_line text` columns to the planned `bible_sight_entries` table.

### 2. Bible Pocket — New "Search" Tab

Add a 4th tab to `BiblePocketSheet.tsx`:

- **Tab**: `"search"` with a `Search` icon
- **UI**: Search input at top, results below
- Searches the user's own `bible_sight_entries` by full-text match on `content`, `tags`, and `summary_line`
- Also searches user's manual journal annotations (`annotations` table where `verse_ids` ends with `.journal`)
- Results show: chapter name, summary line (if Bible Sight), date, truncated preview
- Tapping a result navigates to that chapter and opens the journal panel with that entry loaded
- User content remains private — query is always filtered by `user_id = auth.uid()`

### 3. Admin Portal — Bible Sight Tab Enhancement

The already-planned `BibleSightAdminTab` gains search capabilities:

- Full-text search across all users' Bible Sight entries (admin RLS policy)
- Filter by: tags, lens, model, book, date range
- Shows anonymized stats (no user content exposed in default view — admin must click "View Entry" to see content, respecting the principle that user content is private but admin has oversight access)

### Files Summary (additions to existing plan)

| File | Change |
|------|--------|
| Migration | Add `tags text[]` and `summary_line text` to `bible_sight_entries` |
| `generate-journal/index.ts` | Add `tags` + `summary_line` to LLM output schema |
| `BiblePocketSheet.tsx` | Add `"search"` tab to `PocketTab` union, new search UI |
| `BibleSightAdminTab.tsx` | Add search/filter capabilities |

Everything else from the previously approved plan remains unchanged.

