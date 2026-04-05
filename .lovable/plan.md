

## Make All Verse References Interactive VerseLinks in Deep Study Cards

Three areas in `AutoEnrichLayer.tsx` currently render verse references as plain text. They need to become interactive `VerseLink` components.

### Changes (single file: `src/components/bible/AutoEnrichLayer.tsx`)

**1. Citations footer (lines 192–202)** — Currently renders `card.citations` as plain `<span>` pills. Replace each with `<VerseLink reference={cite} />`. The VerseLink already renders as a styled pill with BookMarked icon, so remove the manual pill styling and let VerseLink handle it.

**2. Cross-ref connections (lines 206–216)** — `ref.to` is a scripture reference string (e.g. "Isaiah 40:3") rendered as plain text. Replace with `<VerseLink reference={ref.to} />`.

**3. Anchor label (line 98–100)** — The `anchorLabel` like "vv. 1–4" shown in the card header. This refers to verses in the current chapter. Construct a full reference string (e.g. "Matthew 3:1-4" from `bookUsfm` + `chapterNumber` + anchors) and render as a `VerseLink`. This requires passing `bookUsfm` and `chapterNumber` as props into `ExegesisCard`.

### New props for ExegesisCard

Add `bookUsfm: string` and `chapterNumber: number` so it can construct full references like `"Genesis 1:1-4"` from the anchor range.

### Book name mapping

Need a small `usfmToName` map (e.g. `{ GEN: "Genesis", MAT: "Matthew", ... }`) to convert USFM codes to human-readable book names for VerseLink references. Add this as a const inside the file or import from an existing utility if one exists.

### Files

| File | Change |
|------|--------|
| `src/components/bible/AutoEnrichLayer.tsx` | Replace plain-text verse references with VerseLink in citations, cross-refs, and anchor labels; add book name mapping; pass bookUsfm/chapterNumber to ExegesisCard |

