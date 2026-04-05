

## Bible Sight Ecosystem: Commentary Library, Public Sessions, Private Chat Logs

Expanding Bible Sight with a Commentary Library drawer, public study sessions with private chat logs, and ingestion of 6 open-domain commentaries.

---

### Phase 1: Database — Commentary Infrastructure

**Migration:** Add `bible_book_usfm`, `chapter_number`, and `source_url` columns to `library_chunks` with an index for deterministic chapter-level lookups. This allows commentary content to be fetched by exact chapter in addition to semantic search.

```sql
ALTER TABLE library_chunks 
  ADD COLUMN IF NOT EXISTS bible_book_usfm text,
  ADD COLUMN IF NOT EXISTS chapter_number integer,
  ADD COLUMN IF NOT EXISTS source_url text;

CREATE INDEX idx_library_chunks_chapter ON library_chunks (bible_book_usfm, chapter_number);
```

Also add `chat_log jsonb` column to `bible_sight_entries` to store the full conversation history privately for the session creator.

---

### Phase 2: Commentary Ingestion Edge Function

**`supabase/functions/ingest-commentary/index.ts`**

Admin-only function that:
- Accepts `{ source_url, book_title, author, format }` (JSON or OSIS XML)
- Fetches raw commentary from GitHub (simoncozens/open-source-bible-data, CrossWire mirrors)
- Parses into ~500-800 token chunks mapped to `bible_book_usfm` + `chapter_number`
- Generates embeddings via Lovable AI Gateway (`text-embedding-3-small` pattern from existing `vectorize-library`)
- Inserts into `library_chunks` and creates `library_toc` entries
- Processes in batches of 50

**6 Commentary Sources (all public domain):**

| Commentary | Author |
|-----------|--------|
| Matthew Henry's Complete Commentary | Matthew Henry |
| Barnes' Notes on the Bible | Albert Barnes |
| Calvin's Commentaries | John Calvin |
| Keil & Delitzsch OT Commentary | Keil & Delitzsch |
| John Wesley's Notes | John Wesley |
| Jamieson-Fausset-Brown | JFB |

---

### Phase 3: Commentary Drawer Component

**`src/components/bible/CommentaryDrawer.tsx`** — New 80% height vaul Drawer matching Bible Sight's design language:

- **Landing view**: Search bar at top, 6 commentary host cards below in a 2-column grid
  - Each card: dignified title typography (serif), author name, subtle parchment/cream card style
  - Cards: Matthew Henry, Barnes, Calvin, Keil & Delitzsch, Wesley, JFB
- **Commentary reading view** (after clicking a card): the drawer transitions to show that commentary's content for the current chapter
  - Blog/magazine layout matching the uploaded screenshot — serif headings, warm body text, amber blockquotes, VerseLink references inline
  - Ornamental SVG dividers between sections (reuse `OliveBranchDivider`, `ScrollOrnament` from DeepStudyDrawer)
  - Back button to return to the 6-card landing
  - Search bar persists at top to filter/search within the commentary
- **X close button** in header corner
- Dark mode: `bg-[#1C1C1E]` with warm accents; Light mode: cream parchment

**Entry point**: New "Commentary" button in `BibleSleeveSheet.tsx` below Bible Sight, with `Library` icon and subtext "6 classical commentaries"

---

### Phase 4: Bible Sight Chat + Session Updates

**`bible-sight-chat` edge function update:**
- Query `library_toc` for all 6 commentaries (not just IVP) matching current chapter
- Include commentary authors in the system prompt context so Bible Sight can reference them naturally: "As Matthew Henry observed..." or "Barnes notes that..."
- Commentary context injected alongside existing IVP scholarly context

**`bible_sight_entries` session storage update:**
- When `[GENERATE_STUDY]` triggers, save the full `messages[]` chat log into the new `chat_log` jsonb column
- The generated study session's `session_data` references commentary sources used

---

### Phase 5: Public Sessions + Private Chat Logs

**Bible Sight Study Session cards are public:**
- Remove `user_id` filter from session queries when `entry_type = 'study_session'` — all sessions are discoverable
- In `BibleSearchDialog.tsx`, study sessions appear for all users (not just the creator)
- Session cards show title, date, chapter reference, creator name (from profiles)

**Private chat log — creator only:**
- In `DeepStudyDrawer.tsx`, when displaying a study session:
  - If `session.user_id === currentUser.id` AND `session.chat_log` exists, render a "My Conversation" collapsible section below the study content
  - Shows the full chat history in the same bubble layout as `BibleSightDrawer`
  - Other users see only the formatted study content — no chat log
- RLS: `chat_log` column is stripped from public reads via a database view or selective column queries

---

### Phase 6: Update `enrich-chapter` + `bible-sight-chat`

Both functions gain commentary awareness:
- `enrich-chapter`: queries `library_chunks` for current chapter's commentary entries (up to 8), injects as additional scholarly context
- `bible-sight-chat`: deterministic chapter match first (`WHERE bible_book_usfm = X AND chapter_number = Y`), then falls back to text search for topical queries spanning multiple books

---

### Phase 7: Bible Sleeve Wiring

**`BibleSleeveSheet.tsx`**: Add "Commentary" button below Bible Sight entry point
**`BibleReader.tsx`**: Add `commentaryOpen` state, render `<CommentaryDrawer>` with current book/chapter

---

### Files Changed

| File | Change |
|------|--------|
| **Migration** | Add `bible_book_usfm`, `chapter_number`, `source_url` to `library_chunks`; add `chat_log` to `bible_sight_entries` |
| `supabase/functions/ingest-commentary/index.ts` | New: fetch, parse, chunk, embed, insert commentary data |
| `src/components/bible/CommentaryDrawer.tsx` | New: 80% height drawer with search + 6 commentary cards + reading view |
| `supabase/functions/bible-sight-chat/index.ts` | Query all commentary TOCs, inject into system prompt |
| `supabase/functions/enrich-chapter/index.ts` | Query commentary chunks for current chapter context |
| `src/components/bible/DeepStudyDrawer.tsx` | Show private chat log for session creator |
| `src/components/bible/BibleSightDrawer.tsx` | Save chat_log when generating study session |
| `src/hooks/useBibleSearch.ts` | Make study sessions public in search results |
| `src/components/bible/BibleSearchDialog.tsx` | Remove user_id filter for study_session results |
| `src/components/bible/BibleSleeveSheet.tsx` | Add Commentary entry point |
| `src/components/bible/BibleReader.tsx` | Wire commentaryOpen state + CommentaryDrawer |
| `src/pages/Admin.tsx` | Commentary ingestion status + trigger buttons |

