

## Commentary Search, Go Deeper Integration, and Bookmarks

Three additions to the Commentary Drawer: AI-powered semantic search, a "Go Deeper" handoff to Bible Sight, and unlimited user bookmarks with an editable side panel.

---

### Model Selection for Commentary Search

All major frontier models (GPT-5, Gemini 2.5 Pro, Grok) have these public-domain commentaries in their training data — Matthew Henry, Barnes, Calvin, Wesley, JFB, and Keil & Delitzsch are among the most widely digitized texts on the internet and have been part of Common Crawl for over a decade. No special fine-tuned model is needed.

**Recommended: `openai/gpt-5`** via the Lovable AI Gateway. Rationale:
- Strongest reasoning and nuance for doctrinal precision
- Excellent at understanding user intent ("what does Calvin say about election here?") and mapping it to the correct commentary content
- Best at contextual disambiguation (distinguishing between commentary authors discussing similar topics)
- The commentary search requires accuracy over speed — this is a deliberate, scholarly lookup, not a real-time chat

The search flow: user types a query → edge function receives query + current book/chapter + optional author filter → GPT-5 reformulates into a precise semantic search → queries `library_chunks` via text search and embedding match → GPT-5 ranks and summarizes results with source attribution → returns ranked results to the UI.

---

### 1. New Edge Function: `commentary-search`

**`supabase/functions/commentary-search/index.ts`**

- Accepts `{ query, book_usfm, chapter_number, author_filter? }` + auth JWT
- Uses GPT-5 via Lovable AI Gateway to:
  1. Understand user intent and expand the query with theological context
  2. Generate a search strategy (exact chapter match + semantic expansion)
- Queries `library_chunks` with deterministic filters first (`bible_book_usfm`, `chapter_number`, optional `author`), then broadens if needed
- Uses GPT-5 to rank results by relevance and doctrinal accuracy
- Returns `{ results: Array<{ id, content, author, book_title, page_reference, relevance_note }> }`
- Auth-gated

---

### 2. "Go Deeper" → Bible Sight Handoff

When a user is reading commentary content or viewing search results:

- Add a "Go Deeper" button (amber accent, `Eye` icon) that appears:
  - At the bottom of each commentary reading view
  - On each search result card
  - On selected/highlighted text via a floating action
- Clicking "Go Deeper" closes the Commentary Drawer and opens `BibleSightDrawer` with a pre-seeded first message:
  - Bible Sight opens already responding with something like: *"Praise God you want to go deeper! I see you were reading {author}'s commentary on {book} {chapter}. Is there anything in particular you'd like to explore — or would you like to see what Bible Sight can see?"*
- This is achieved by passing a `initialContext` prop to `BibleSightDrawer` containing the commentary excerpt and author, which gets injected as the first assistant message

**BibleReader.tsx wiring:**
- New callback `onGoDeeper(context: { author: string, excerpt: string })` passed to `CommentaryDrawer`
- Sets `bibleSightOpen = true` and passes context to `BibleSightDrawer`

---

### 3. Commentary Bookmarks

**Migration:** New `commentary_bookmarks` table:

```sql
CREATE TABLE public.commentary_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author text NOT NULL,
  book_usfm text NOT NULL,
  chapter_number integer NOT NULL,
  chunk_id uuid REFERENCES library_chunks(id) ON DELETE SET NULL,
  excerpt text NOT NULL,
  title text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.commentary_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own bookmarks"
  ON public.commentary_bookmarks FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

**UI in CommentaryDrawer:**

- **Bookmark action**: Long-press or right-click on any commentary paragraph → "Bookmark this passage" option. Auto-generates a short title via AI (or uses first 8 words as fallback).
- **Bookmarks side panel**: Collapsible panel on the right side of the drawer (or bottom sheet on mobile)
  - Shows list of bookmarks grouped by date, with time and AI-generated title
  - Long-press or right-click a bookmark title → title becomes immediately editable (inline `contentEditable`), click away to save
  - Clicking a bookmark navigates to that commentary + chapter
  - Delete via swipe or context menu
- **Bookmark icon** in the Commentary Drawer header toggles the panel open/closed
- Unlimited bookmarks per user

---

### 4. Updated CommentaryDrawer Search UI

Replace the current simple text filter with the AI-powered search:

- Search bar stays at top, same styling
- On submit (Enter or search icon tap), calls `commentary-search` edge function
- Results appear as cards below the search bar, replacing the commentary host grid temporarily
- Each result card shows: author name, excerpt (highlighted match), relevance note from GPT-5, and a "Go Deeper" button
- "Clear search" button returns to the 6-card host landing
- Loading state: skeleton cards with amber shimmer

---

### Files Changed

| File | Change |
|------|--------|
| **Migration** | Create `commentary_bookmarks` table with RLS |
| `supabase/functions/commentary-search/index.ts` | New: GPT-5 powered semantic search across commentary library |
| `src/components/bible/CommentaryDrawer.tsx` | AI search integration, Go Deeper button, bookmark actions, bookmarks side panel |
| `src/components/bible/BibleSightDrawer.tsx` | Accept `initialContext` prop for pre-seeded handoff message |
| `src/components/bible/BibleReader.tsx` | Wire `onGoDeeper` callback between CommentaryDrawer and BibleSightDrawer |

