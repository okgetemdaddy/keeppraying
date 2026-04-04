

## Classical Prayers Vault Redesign + /classical Page

### Overview
Three-part redesign: (1) upgrade ClassicalPrayersLibrary.tsx to a premium archival manuscript vault UI, (2) update PrayerResourcesDrawer.tsx classical tab, (3) create a new standalone /classical page with Grok-powered semantic search.

### 1. ClassicalPrayersLibrary.tsx — Manuscript Vault UI

**Grid Architecture:**
- Replace `space-y-2` list with CSS Grid: `grid grid-cols-1 md:grid-cols-2 gap-4`
- Each card gets staggered heights via content length → masonry-mimicking effect
- Cards use `break-inside-avoid` inside a `columns-1 md:columns-2` CSS columns layout for true masonry

**Typography Upgrade:**
- Prayer text: `font-display italic leading-loose text-[15px]` (Playfair Display serif)
- Author/era metadata: `font-body text-xs tracking-wider uppercase text-muted-foreground`
- Drop cap on first letter: `first-letter:text-4xl first-letter:font-display first-letter:float-left first-letter:mr-2`

**Apple Pencil Hover States:**
- Card: `hover:shadow-lg hover:border-primary/30 hover:scale-[1.01] transition-all duration-300 ease-out`
- Subtle gradient border on hover via `hover:ring-1 hover:ring-primary/20`
- `// TODO: iPadOS Port - Bind Apple Pencil squeeze event here to trigger AI historical context popover`

**VerseLinks Integration:**
- Import `renderWithVerseLinks` from `@/lib/renderWithVerseLinks`
- Replace raw `{prayer.prayer_text}` and `{prayer.extended_text}` with `renderWithVerseLinks(prayer.prayer_text)` — this auto-detects Scripture references and renders them as interactive VerseLink components (which already use the Grok-powered verse-summary edge function)

### 2. PrayerResourcesDrawer.tsx — Classical Tab Update

- Update `PrayerCard` component: add `font-display italic` for classical variant
- Change `line-clamp-3` to `line-clamp-4` as specified
- Apply `renderWithVerseLinks(text)` to prayer text rendering
- Add hover states matching the vault aesthetic

### 3. New /classical Page — Standalone Classical Prayers Experience

**File:** `src/pages/Classical.tsx`

**Layout:**
- Full-page premium dark/cream aesthetic with hero section
- Hero: ornamental header "The Manuscript Vault" with decorative Scroll icon, subtitle about the archival collection
- Search bar: prominent, centered, with placeholder "Search by author, theme, or Scripture…"

**Grok-Powered Semantic Search:**
- New edge function `supabase/functions/classical-search/index.ts`
- Accepts `{ query: string }` — uses Grok API to understand sentiment/intent, then constructs a semantic search
- Flow: (1) Grok interprets the query to extract keywords, themes, Scripture refs, and sentiment, (2) queries `classical_prayers` table with intelligent filtering, (3) falls back to Gemini Flash via Lovable AI Gateway if Grok fails
- Returns ranked results with a `relevance_reason` explaining why each prayer matches

**Grid:**
- Same masonry columns layout as the library component
- Cards are full-featured: expandable, with VerseLinks, save-to-board, labels
- Filters: era chips (Early Church, Medieval, Reformation, Modern), label-based filtering

**Route:** Add `<Route path="/classical" element={<Classical />} />` in App.tsx

### 4. Edge Function: classical-search

```
POST /classical-search
Body: { query: string, era?: string, labels?: string[] }

1. Call Grok to interpret query → extract themes, Scripture refs, sentiment
2. Build Supabase query with intelligent OR conditions
3. If Grok fails → fall back to Lovable AI Gateway (Gemini Flash)
4. Return { results: ClassicalPrayer[], interpretation: string }
```

### Files

| File | Action |
|------|--------|
| `src/components/ClassicalPrayersLibrary.tsx` | **Edit** — masonry grid, serif typography, hover states, VerseLinks, TODO comments |
| `src/components/keepreading/PrayerResourcesDrawer.tsx` | **Edit** — classical tab formatting, line-clamp-4, VerseLinks |
| `src/pages/Classical.tsx` | **Create** — standalone /classical page with hero, Grok search, masonry grid |
| `supabase/functions/classical-search/index.ts` | **Create** — Grok-powered semantic search with Gemini fallback |
| `src/App.tsx` | **Edit** — add /classical route |

### TODO Comments Placement
- Each prayer card: `// TODO: iPadOS Port - Bind Apple Pencil squeeze event here to trigger AI historical context popover`
- Search input: `// TODO: iPadOS Port - Support Scribble handwriting input for search`
- Card long-press area: `// TODO: iPadOS Port - Bind long-press for quick-save context menu`

