

## Fix Session Chapter Index & Display Label

### Changes

**1. `src/components/bible/CanvasCreationDrawer.tsx` (line 327)**

Change the fallback from `chapterNum` to `chapterNum + 1` so the stored chapter_id is 1-indexed:

```ts
chapter_id: typeof selectedChapter?.id === "number" ? selectedChapter.id : chapterNum + 1,
```

**2. `src/components/bible/BibleReader.tsx` (lines 969–971)**

Look up the human-readable book title from `index?.books` and use it in `verseRange`. Add a TODO comment for multi-book sessions:

```ts
// TODO: Multi-book sessions — track last_book_usfm and last_chapter_id on session row
const bookTitle = index?.books?.find(b => b.id === s.book_usfm)?.title ?? s.book_usfm;
verseRange: s.verse_start && s.verse_end
  ? `${bookTitle} ${s.chapter_id}:${s.verse_start}–${s.verse_end}`
  : `${bookTitle} ${s.chapter_id}`,
```

### Files
| File | Change |
|------|--------|
| `src/components/bible/CanvasCreationDrawer.tsx` | Fix 0-indexed fallback → `chapterNum + 1` |
| `src/components/bible/BibleReader.tsx` | Use book title instead of USFM code in session verseRange; add multi-book TODO |

