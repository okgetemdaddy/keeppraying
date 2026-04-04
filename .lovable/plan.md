

## Two Post-Pencil Fixes + Debug Cleanup

### Fix 1 — Two-finger scroll in study mode (BibleReader.tsx, lines 957-994)

Update the manual two-finger scroll `useEffect`:
- Add `e.preventDefault()` at the top of `onTouchMove` to suppress competing scroll
- Replace `window.scrollBy(0, deltaY)` with logic that finds the nearest scrollable ancestor via `area.closest('[style*="overflow"]')`, falling back to `area.parentElement`, then `window`
- Apply a `* 2.5` multiplier to `deltaY` for natural-feeling scroll distance
- Change `touchmove` listener registration from `{ passive: true }` to `{ passive: false }` so `preventDefault` works

### Fix 2 — Underline gesture highlight matching (BibleReader.tsx, lines 2302-2319)

Replace the exact `indexOf` match with normalized matching:
- Collapse whitespace in both `verseData.text` and `underlinedText` via `.replace(/\s+/g, ' ')` before comparing
- Add a fallback: if normalized substring match still fails, highlight the entire verse and show a success toast for the verse number instead of silently failing

### Fix 3 — Remove debug overlay (InkOverlay.tsx)

The debug infrastructure was already removed in the previous edit (search confirms no `debugLog` references remain). No action needed here.

### Files

- `src/components/bible/BibleReader.tsx` — two edits (scroll logic + underline matching)

