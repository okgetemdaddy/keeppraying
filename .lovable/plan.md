

# Fix: Scroll to Verse After Search Navigation on Mobile

## Problem
When searching "John 3:16", the app navigates to John chapter 3 correctly, but on mobile the page doesn't scroll to verse 16. The current approach uses a fixed `setTimeout(500ms)` which fires before the verse DOM elements are rendered — the chapter data hasn't loaded yet.

This same fragile pattern exists in **5 places** throughout `BibleReader.tsx` (search navigate, bunch navigate, selection navigate, sleeve navigate, and board annotations).

## Solution
Replace all fixed-timeout scroll-to-verse calls with a robust approach that **waits for the target verse element to actually appear in the DOM** before scrolling.

### Implementation

**1. Add a `pendingScrollVerse` ref + effect in `BibleReader.tsx`**

Instead of `setTimeout`, store the target verse number in a ref. After the chapter verses render, an effect checks if the pending verse element exists and scrolls to it.

```typescript
const pendingScrollVerseRef = useRef<number | null>(null);

// Effect that fires when verses finish rendering
useEffect(() => {
  if (pendingScrollVerseRef.current == null) return;
  const verseNum = pendingScrollVerseRef.current;
  const el = document.getElementById(`verse-${verseNum}`);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    pendingScrollVerseRef.current = null;
  }
}, [verses]); // `verses` is the loaded chapter verse data
```

**2. Update all 5 scroll-to-verse call sites** to set the ref instead of using `setTimeout`:

- `handleSearchNavigate` (line ~923)
- `handleNavigateToBunch` (line ~907)
- `handleNavigateToSelection` (line ~940)
- Sleeve annotation click (line ~1363)
- Any remaining `setTimeout` + `scrollIntoView` patterns

Each becomes simply:
```typescript
pendingScrollVerseRef.current = verseNumber;
```

**3. Fallback with MutationObserver** (safety net)

If the effect fires before the DOM updates (unlikely but possible with async rendering), add a short MutationObserver fallback inside the effect that watches for the element to appear, with a 3-second timeout to avoid leaks.

### Files Modified
| File | Change |
|------|--------|
| `src/components/bible/BibleReader.tsx` | Add `pendingScrollVerseRef` + effect, replace all 5 `setTimeout` scroll patterns |

### Why This Works
- The `verses` dependency in the effect guarantees the scroll attempt happens **after** the data loads and React renders the verse elements
- Works regardless of network speed or device performance
- Eliminates all race conditions from arbitrary timeouts
- Single pattern for all verse-scroll needs

