

# AI-Powered Word Study & Reference Bloom System

## What this does
When a user circles 1-3 words with Apple Pencil, a floating "Reference Bloom" card appears at the gesture location showing the original Hebrew/Greek word, Strong's number, cross-references, and an AI contextual note — all without leaving the current chapter. Also accessible from the FloatingToolbar via a new "Reference" button.

## Technical changes

### 1. New edge function: `supabase/functions/word-study/index.ts`

- Receives `{ word, verseText, bookUsfm, chapter, verseNumber, translationId }`
- Uses Lovable AI (`google/gemini-3-flash-preview`) with a system prompt that:
  - Identifies OT (Hebrew) vs NT (Greek)
  - Returns the original word, transliteration, Strong's number, definition, frequency, semantic range
  - Generates up to 6 cross-references with preview text and relevance labels
  - Writes a 2-3 sentence contextual note
- Uses tool calling to extract structured JSON output (avoiding JSON parse issues)
- Handles 429/402 error codes with clear messages
- CORS headers included

### 2. New hook: `src/hooks/useWordStudy.ts`

- Wraps the edge function call in React Query
- `queryKey: ["word-study", word, bookUsfm, chapter, verseNumber]`
- `staleTime: 24 * 60 * 60 * 1000` (24 hours)
- Returns typed `WordStudyResult` matching the edge function output shape
- `enabled` only when word is non-empty

### 3. New component: `src/components/bible/ReferenceBloom.tsx`

- Props: `anchorPoint`, `word`, `verseNumber`, `bookUsfm`, `chapter`, `versionId`, `onClose`, `onNavigate`, `onPinToMargin`
- Uses `position: fixed` with viewport edge-clamping logic
- Three pill tabs: "Word" (default for 1-word), "Refs" (default for verse-level), "Note"
  - **Word tab**: original language, transliteration, Strong's number, frequency, semantic range chips
  - **Refs tab**: up to 6 cross-references with label + preview + "Go" button
  - **Note tab**: AI contextual explanation (2-3 sentences)
- Bottom action bar: Pin icon (`onPinToMargin`) and Plan+ icon (placeholder `onAddToPlan`)
- 280px wide, max 360px tall, internal scroll
- Framer Motion entry: scale 0.95→1, opacity 0→1
- Styled with `bg-card border border-border shadow-lg rounded-xl`, EB Garamond for verse text
- Bible-dark mode: `shadow-[0_0_12px_rgba(255,215,0,0.05)]` glow
- Close on Escape or click-outside (useEffect listeners)
- Loading skeleton while AI call resolves

### 4. Wire into `BibleReader.tsx`

**New state:**
```
referenceBloom: { x: number; y: number; word: string; verseNumber: number } | null
```

**Modify `onCircleSelect` callback (line ~2024):**
- After the existing verse-selection logic, add a check: if circle encloses text within a single verse AND the enclosed area is small (1-3 words detected), extract the word text from the DOM using the convex hull center point + `document.elementFromPoint`
- Set `referenceBloom` with the word, verse number, and hull center coordinates
- If more than 3 words or multiple verses, keep existing behavior (verse selection)

**Render `<ReferenceBloom>`** when `referenceBloom` is set, passing current `bookUsfm`, `currentChapter.id`, `versionId`, and `handleSearchNavigate` as `onNavigate`. Pin-to-margin calls `saveAnnotationMut` with a `type: "word-study"` flag.

### 5. Add "Reference" button to `FloatingToolbar.tsx`

- New prop: `onReference?: (verseNumber: number, word?: string) => void`
- Add `BookOpen` icon button after "Cross-refs" in the action buttons section
- When tapped: if partial selection exists, pass the selected text as `word`; otherwise pass the full verse text
- Calls `onReference(primaryVerse, word)` then `onDismiss()`

**BibleReader wiring:** Pass `onReference` that opens `referenceBloom` using toolbar position as anchor point.

### 6. No changes to

- `InkOverlay.tsx` gesture detection logic
- `ZoomWrapper` or `ManuscriptCanvas`
- `EnrichedVerse` component structure

## Files changed

| File | Change |
|------|--------|
| `supabase/functions/word-study/index.ts` | New — AI word study edge function |
| `src/hooks/useWordStudy.ts` | New — React Query hook for word study data |
| `src/components/bible/ReferenceBloom.tsx` | New — floating card with Word/Refs/Note tabs |
| `src/components/bible/FloatingToolbar.tsx` | Add `onReference` prop + BookOpen button |
| `src/components/bible/BibleReader.tsx` | Add `referenceBloom` state, modify circle-select handler, render ReferenceBloom, wire toolbar |

