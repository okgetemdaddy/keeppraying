

## Fix: Make Bible Sight Accessible From the Bible Pocket (All Devices)

### The Problem

Right now, Bible Sight journal generation is **only reachable** through the JournalPanel, which requires:
1. Being on an iPad (study mode is iPad-gated)
2. Entering Study Mode
3. Switching to "journal" variant
4. Opening the journal panel

Additionally, the `chapterVerses` and `versionId` props are **never passed** to `JournalPanel` from `BibleReader.tsx`, so even if you reach the panel, the "✦ Bible Sight" button is hidden (it checks `chapterVerses?.length`).

### The Fix (2 changes)

**1. Wire missing props in `BibleReader.tsx`** (line ~3760)

Pass `chapterVerses` and `versionId` to the existing `<JournalPanel>`:

```tsx
<JournalPanel
  ...existing props...
  chapterVerses={verses.map(v => ({ number: v.number, text: v.text }))}
  versionId={versionId}
/>
```

**2. Add Bible Sight entry point to the Bible Pocket (all devices)**

In `BiblePocketSheet.tsx`, add a Bible Sight generation button to the **Journal tab** so users on any device (desktop, mobile, iPad) can generate entries without needing study mode. This mirrors the same `useJournalGeneration` hook call already in JournalPanel.

The Journal tab in Bible Pocket will show:
- Existing journal entries list (already there)
- A `✦ Bible Sight` button at the top when the user has no entries for this chapter, or a muted button at the bottom otherwise
- Generated text opens the JournalPanel with the content pre-filled

This requires passing `chapterVerses`, `versionId`, `bookUsfm`, and `chapterId` props down to `BiblePocketSheet` from `BibleReader`.

### Files Modified

| File | Change |
|------|--------|
| `src/components/bible/BibleReader.tsx` | Pass `chapterVerses`, `versionId`, `bookUsfm`, `chapterId` to both `JournalPanel` and `BiblePocketSheet` |
| `src/components/bible/BiblePocketSheet.tsx` | Accept new props, add Bible Sight button to Journal tab, wire `useJournalGeneration` hook |

### How to Access (After Fix)

1. Open any chapter (e.g., Ruth 1)
2. Tap the **Bible Pocket** icon (panel-right icon in toolbar, works on all devices)
3. Switch to the **Journal** tab
4. Tap **✦ Bible Sight** — generates a journal entry for this chapter
5. Entry auto-saves and appears in the list with a "refresh & update" link below it

