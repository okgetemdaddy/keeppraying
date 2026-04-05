

## Deep Study + Dual-Model Journals + Study Session Drawer

Five interconnected changes that make Deep Study the deepest Bible study experience available in an app.

---

### 1. Scholarly Library: `library_toc` Table + Data Seeding

**Migration:** Create `library_toc` with columns: `id`, `book_title`, `author`, `bible_book_usfm`, `chapter_start`, `chapter_end`, `section_title`, `content_summary`, `page_reference`.

Populate via insert tool with IVP Commentary chapter-by-chapter TOC entries mapped to USFM codes (MAT 1-28, MRK 1-16, etc.). Each row holds Keener's section title and a content summary so the edge function can deterministically pull the right context without vector search for this resource.

The other 9 reference works get inserted into existing `library_chunks` table via a new `vectorize-library` edge function (chunked + embedded for semantic search).

**Add `secondary_json` column** to `enriched_chapters` table for caching the Gemini supplementary pass.

---

### 2. Dual-Model `enrich-chapter` (Parallel Primary + Secondary)

Refactor `enrich-chapter/index.ts` to accept a `pass` parameter:

- **`pass: "primary"`** — Grok 4.20 reasoning (`grok-4-0709`)
  - For NT chapters: query `library_toc` to pull exact IVP Commentary context (5-8K tokens)
  - Inject into system prompt: "The following is from Craig Keener's IVP Bible Background Commentary for this chapter..."
  - Returns core bunches, highlights, exegesis cards, crossRefs
  - Cached in `enriched_chapters.content_json`

- **`pass: "secondary"`** — Gemini 2.5 Pro via Lovable AI gateway
  - Generates embedding of chapter text, queries `match_library_chunks` for top 8 chunks from all other scholarly works (Vine's, BDAG, Beale, etc.)
  - System prompt instructs: "Supplement with word studies, cross-canonical theology, and historical-cultural insights"
  - Returns supplementary cards only
  - Cached in `enriched_chapters.secondary_json`

---

### 3. Dual-Model Journal Generation (Both Write Entries)

Refactor `generate-journal/index.ts`:

When Deep Study completes, **both models generate journal entries in parallel** using the master personality prompt + lens rotation system:

- **Grok 4.20**: Gets IVP Commentary context injected, writes a journal entry with deep historical-cultural grounding
- **Gemini 2.5 Pro**: Gets the other scholarly library context, writes a journal entry with broader theological/linguistic depth

Both entries saved to `bible_sight_entries` with `model_used` distinguishing them. Both auto-saved as annotations.

**Client-side:** `useChapterEnrichment` fires journal generation automatically after primary enrichment completes (debounced, only if no journal exists for this chapter).

---

### 4. Progressive Rendering in `useChapterEnrichment`

Refactor `useChapterEnrichment.ts`:

- Fire two parallel `supabase.functions.invoke` calls: `pass: "primary"` and `pass: "secondary"`
- Maintain `primaryData` and `secondaryData` state slots
- Expose merged `data` (primary cards first, secondary appended)
- `isLoading` = true while primary pending; `isLoadingMore` = true while secondary pending
- When primary completes → auto-trigger dual journal generation
- `AutoEnrichLayer.tsx`: render primary cards immediately, show "Deeper insights loading..." shimmer below, animate secondary cards in with staggered fade-up. Secondary cards get badges like "Word Study" or "Historical Parallel".

---

### 5. Deep Study Session Card in Bible Sleeve → 80% Height Drawer

**`BibleSleeveSheet.tsx`:** Add a "Deep Study Session" card in the Studies section that appears when `deepStudyActive` is true or cached enrichment exists. Card shows: chapter title, lens used, card count, timestamp.

**New component: `DeepStudyDrawer.tsx`** — An 80% height `Drawer` (using vaul) that opens when the session card is clicked:

- Full-screen scrollable presentation of all Deep Study content:
  - Exegesis cards rendered blog-style (prose typography, EB Garamond-style headers, amber blockquotes)
  - Cross-references as interactive `VerseLink` components
  - Highlights summary section
  - Journal entries section (both Grok and Gemini entries) with blog-style formatting matching the screenshot
  - Dark mode: `bg-[#1C1C1E]`, `text-neutral-100`, amber accents
  - Light mode: warm cream, dark text
- Segmented control at top: "Exegesis" | "Journals" | "Cross-References"
- Each journal card shows model badge (subtle), lens used, tags, full formatted text with `renderWithVerseLinks`

---

### 6. Journal Card Delete (3-Dot Menu)

**`BiblePocketSheet.tsx`:** Add `MoreVertical` icon on each journal card → `DropdownMenu` with "Delete Journal" (red, Trash2 icon) → confirmation AlertDialog → calls `onDeleteJournal(ann.id)`.

**`BibleReader.tsx`:** Wire `onDeleteJournal` to delete both the annotation and the corresponding `bible_sight_entries` row.

---

### Files Changed

| File | Change |
|------|--------|
| **Migration** | Create `library_toc`, add `secondary_json` to `enriched_chapters` |
| `supabase/functions/vectorize-library/index.ts` | New: chunk + embed JSON scholarly library |
| `supabase/functions/enrich-chapter/index.ts` | Dual-pass: primary (Grok+IVP) / secondary (Gemini+vectors) |
| `supabase/functions/generate-journal/index.ts` | Accept scholarly context, support dual-model parallel generation |
| `src/hooks/useChapterEnrichment.ts` | Parallel invoke, progressive state, auto-journal trigger |
| `src/components/bible/AutoEnrichLayer.tsx` | Progressive card rendering, secondary shimmer, journal preview |
| `src/components/bible/DeepStudyDrawer.tsx` | New: 80% height drawer with full study session presentation |
| `src/components/bible/BibleSleeveSheet.tsx` | Add Deep Study session card linking to drawer |
| `src/components/bible/BiblePocketSheet.tsx` | 3-dot delete menu on journal cards |
| `src/components/bible/BibleReader.tsx` | Wire delete handler, pass journal/enrichment state |

