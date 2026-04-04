

## Filter PaperCanvas Verses to Session Range

### Problem
When a canvas study session is started with a specific verse range (e.g. Genesis 1:1–10), the PaperCanvas still renders **all** chapter verses. The session config stores the selected verses, but they're not used to filter what's displayed.

### Change

**`src/components/bible/BibleReader.tsx` (~line 2733)**

Before the `verses.map(...)` inside the PaperCanvas children, compute a filtered list based on the active session config's verse range:

```ts
const canvasVerses = activeSessionConfig?.verses.length
  ? verses.filter(v => v.number >= activeSessionConfig.verses[0].number && v.number <= activeSessionConfig.verses[activeSessionConfig.verses.length - 1].number)
  : verses;
```

Then replace `verses.map((v) => {` with `canvasVerses.map((v) => {` on line 2733.

### Files
| File | Change |
|------|--------|
| `src/components/bible/BibleReader.tsx` | Add `canvasVerses` filter, use it in PaperCanvas's verse map |

