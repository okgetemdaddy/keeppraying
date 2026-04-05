

## Fix: Resumed Session Navigation + SVG Text Layout Architecture

### Part 1: Fix Resume Handler (Blocking Bug)

**File: `src/components/bible/BibleReader.tsx`** — `handleResumeSession` (~line 1064)

**Problem**: The resume handler sets session config and enters study mode but never navigates to the session's book/chapter. The canvas opens on whatever chapter the user was already viewing.

**Fix**:
1. After `setShowResumeOrNew(false)`, navigate to the session's book and chapter:
   - `setBookUsfm(s.book_usfm)` if it differs from current
   - Compute `targetChapterIdx` from `s.chapter_id` (1-indexed → 0-indexed) and `setChapterIdx()`
2. Populate `verses` array from `s.verse_start`/`s.verse_end` instead of empty `[]` — the verse numbers are what the filter on line 3035 needs
3. Restore camera position from session's `camera_x/y/scale/rotation` into `paperCameraRef`
4. Add `bookUsfm`, `chapterIdx`, `index` to the `useCallback` dependency array

**File: `src/components/bible/PaperCanvas.tsx`** — Add mount-time camera restore

Add a `useEffect` that checks `cameraRef?.current` for non-default values on mount and applies them via `transformState` + `applyTransform()`.

### Part 2: Create `src/lib/svgTextLayout.ts`

New pure-TypeScript module. Exports:
- `SvgTextLayoutConfig`, `SvgTextLayoutResult`, `SvgWordElement` interfaces
- `layoutBibleText(config)` function

The function:
- Uses offscreen `<canvas>` 2D context with `ctx.measureText()` for sub-pixel word width measurement
- Performs word-wrapping with verse number superscripts
- Outputs a `<g>` SVG string with `<text>` and `<tspan>` elements (each word gets `data-verse` and `data-word-idx` attributes)
- Returns `wordElements` array with bounding boxes for future hit-testing migration
- iPadOS comment about CTFramesetter/CTLine

### Part 3: Store SVG Text as Annotation on Session Start

**File: `src/components/bible/BibleReader.tsx`** — in the `onStartSession` handler

After session config is built:
1. Run the font loading barrier (`document.fonts.load()` with 3s timeout + `document.fonts.ready`)
2. Call `layoutBibleText()` with session config
3. Save SVG text string via `saveAnnotation` mutation with verse_id key `{bookUsfm}.{chapterId}.svgtext`
4. Save word map JSON via `saveAnnotation` mutation with verse_id key `{bookUsfm}.{chapterId}.wordmap`

### Part 4: Render SVG Text Layer in PaperCanvas (Phase 1 — Alongside DOM)

**File: `src/components/bible/PaperCanvas.tsx`**

Add optional `svgTextLayer?: string` prop. Render an absolutely-positioned `<svg>` with `dangerouslySetInnerHTML` inside the paper div, aligned to `textBoxConfig`, with `pointer-events: none` and `z-index: 2`.

**File: `src/components/bible/BibleReader.tsx`**

Load the SVG text annotation from chapter annotations and pass it to `<PaperCanvas svgTextLayer={...}>`. DOM text remains as-is for visual comparison.

### Part 5: Font Loading Barrier

In the `onStartSession` flow, before calling `layoutBibleText`:
- `document.fonts.load(fontString)` with 3s `Promise.race` timeout
- `document.fonts.ready` await
- Warn on timeout, proceed with fallback font (internally consistent)
- iPadOS comment about `UIFont(name:size:)` synchronous loading

---

### Files Summary

| File | Action |
|------|--------|
| `src/components/bible/BibleReader.tsx` | Fix `handleResumeSession` navigation + camera restore; wire SVG layout on session start; pass `svgTextLayer` to PaperCanvas |
| `src/components/bible/PaperCanvas.tsx` | Add camera restore on mount; add `svgTextLayer` prop + SVG render |
| `src/lib/svgTextLayout.ts` | **New** — pure text-to-SVG layout engine |

