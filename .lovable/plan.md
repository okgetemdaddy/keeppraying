

## Deep Study — AutoEnrich Canvas Implementation Plan

This is a large feature spanning 6 files (1 migration, 1 edge function, 1 hook, 1 component, 2 edits). The plan follows the refined "Six Pivots" architecture: inline layer, single model, study rail, viewport-aware stagger, on-demand connectors, explicit adopt buttons.

---

### Phase 1: Database

**Migration: `enriched_chapters` table**

```sql
CREATE TABLE public.enriched_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_usfm text NOT NULL,
  chapter_number int NOT NULL,
  version_id int NOT NULL,
  content_json jsonb NOT NULL,
  model_version text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (book_usfm, chapter_number, version_id)
);

ALTER TABLE public.enriched_chapters ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read cached enrichments
CREATE POLICY "Authenticated users can read enrichments"
  ON public.enriched_chapters FOR SELECT
  TO authenticated USING (true);
```

The `content_json` column stores the full structured output:
```json
{
  "bunches": [{ "verseRange": [1,4], "label": "The Call to Repentance", "type": "thematic" }],
  "highlights": [{ "verseId": 2, "tokenSpan": "metanoia", "tag": "greek_root", "colorHint": "cyan" }],
  "cards": [{ "id": "...", "anchors": [1,4], "title": "...", "body": "...", "citations": ["Isaiah 40:3"] }],
  "crossRefs": [{ "from": 3, "to": "Isaiah 40:3", "type": "quotation" }]
}
```

Insert/update happens via service role in the edge function only.

---

### Phase 2: Edge Function

**`supabase/functions/enrich-chapter/index.ts`**

Single Gemini Pro call using Lovable AI Gateway with tool calling for structured output.

- **Input**: `{ book_usfm, chapter_number, version_id, verses: [{number, text}] }`
- **Cache check**: Query `enriched_chapters` first. If hit, return in ~50ms.
- **Cache miss**: Call Lovable AI Gateway (`google/gemini-2.5-pro`) with a tool definition that enforces the structured output schema (bunches, highlights, cards, crossRefs).
- **System prompt**: Seminary-level Historical-Grammatical exegesis persona. Each card gets 2+ paragraphs covering 1st-century context, Greek/Hebrew roots, theological significance, and life application. Verse groupings are thematic bunches of 3-6 ranges.
- **Upsert** result into `enriched_chapters` using service role client.
- **Error handling**: 429/402 surfaced to client. Grok fallback if Gemini fails.
- JWT validated in code (matching existing edge function pattern from `generate-journal`).

---

### Phase 3: React Hook

**`src/hooks/useChapterEnrichment.ts`**

```typescript
useChapterEnrichment(bookUsfm, chapterNumber, versionId, verses)
// Returns: { data: EnrichmentPayload | null, isLoading, trigger: () => void }
```

- Manual trigger only (user taps "Deep Study").
- Calls `supabase.functions.invoke("enrich-chapter", { body })`.
- React Query cached with key `["enrichment", bookUsfm, chapterNumber, versionId]`.
- `staleTime: Infinity` since enrichments are global and immutable.

---

### Phase 4: AutoEnrichLayer Component

**`src/components/bible/AutoEnrichLayer.tsx`**

Renders **inside** the BibleReader's `readingScrollRef` container (same scroll context as `MarginAnnotationLayer` and `InkOverlay`). Not a z-50 overlay.

**Layout modes:**
- **iPad landscape (>1024px)**: Parent reading area shifts to a CSS grid `[gutter 40px][text 1fr][study-rail 320px]`. The study rail renders cards anchored to verse y-positions with collision-avoidance stacking.
- **Portrait / mobile**: Cards render as inline expandable chips directly below each verse bunch. Tap to expand full exegesis.

**Visual elements:**
1. **Highlight underlay**: Thin colored underlines on key words/phrases. Amber (`#F59E0B/40`) for thematic, cyan (`#06B6D4/40`) for linguistic. Distinct from user highlight colors.
2. **Structural brackets**: Thin bracket glyphs in the left gutter grouping verse bunches. Staggered fade-in (60ms per bunch).
3. **Study Rail cards**: `bg-zinc-900/60 backdrop-blur-xl border border-white/8 rounded-2xl`. Title, 2-paragraph exegesis in EB Garamond, cross-ref chips, visible "Keep" button.
4. **On-demand connectors**: Hover/press a card draws a single SVG elbow line from card to anchor verse. Released = fade out.
5. **Blend control**: Top HUD with Off / Light (15%) / Full opacity. Stored in localStorage.

**Viewport-aware reveal**: `IntersectionObserver` triggers staggered animations as bunches scroll into view. Respects `prefers-reduced-motion`.

**Props:**
```typescript
interface AutoEnrichLayerProps {
  data: EnrichmentPayload | null;
  isLoading: boolean;
  active: boolean;
  verses: { number: number; text: string }[];
  // Adoption callbacks
  onAdoptHighlight: (verseNumber: number, color: string) => void;
  onAdoptNote: (verseNumber: number, content: string) => void;
  onAdoptBunch: (bunchName: string, items: CrossBunchItem[]) => void;
  onClose: () => void;
  isDark: boolean;
}
```

**Adoption flow:**
- "Keep" on a card → `mutations.saveNote()` with `origin: 'deep_study'` in content prefix
- Tap a highlight → color picker swatch row → pick color → `mutations.addHighlight()`
- "Keep All" → batch-adopts all visible cards + highlights
- All adoption uses existing `useBibleMutations` with optimistic updates

---

### Phase 5: Integration

**`src/components/bible/BibleReader.tsx`** edits:
- Add `deepStudyActive` boolean state
- Add `useChapterEnrichment` hook call
- When `deepStudyActive` on iPad landscape: apply grid layout `[gutter][text max-w-2xl][study-rail 320px]` replacing centered `max-w-3xl`
- Mount `<AutoEnrichLayer>` inside the `readingScrollRef` div (line ~3369), alongside `MarginAnnotationLayer`
- Wire adoption callbacks to existing `mutations.addHighlight`, `mutations.saveNote`, `mutations.createBunch`

**`src/components/bible/BibleSleeveSheet.tsx`** edits:
- Add "Deep Study" button between "My Studies" and "Trash Bin" sections (line ~936)
- Sparkle icon, calls `onTriggerDeepStudy` callback
- New prop: `onTriggerDeepStudy?: () => void; deepStudyActive?: boolean`

---

### Files Summary

| File | Action |
|------|--------|
| Migration | Create `enriched_chapters` table with RLS |
| `supabase/functions/enrich-chapter/index.ts` | Create — single Gemini Pro call via Lovable AI, structured output, DB cache |
| `src/hooks/useChapterEnrichment.ts` | Create — manual trigger hook with React Query |
| `src/components/bible/AutoEnrichLayer.tsx` | Create — inline enrichment renderer with study rail |
| `src/components/bible/BibleReader.tsx` | Edit — mount layer, grid layout, state + callbacks |
| `src/components/bible/BibleSleeveSheet.tsx` | Edit — add Deep Study trigger button |

### De-scoped (as agreed)
- Persistent SVG thread artwork
- Auto-scrolling cinematic choreography
- Dual-model pipeline
- Full-screen overlay
- Fake handwriting or simulated ink
- Cross-chapter enrichment linking

