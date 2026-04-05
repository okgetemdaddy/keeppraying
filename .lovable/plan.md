

## Auto-VerseLink in Journal Entries

### What Changes

When displaying journal entry text in `JournalPanel.tsx` (and `BiblePocketSheet.tsx`), any scripture reference (e.g. "John 3:16", "Psalm 23:1-4") found in the text is automatically rendered as an interactive `<VerseLink>` component — giving users hover summaries on desktop and bottom-sheet summaries on mobile.

This applies to:
- The **preview text** shown on entry cards in the "Previous Entries" list (line 286-288)
- The **"refresh & update"** generated entries displayed in the pocket

The existing `renderWithVerseLinks()` utility from `src/lib/renderWithVerseLinks.tsx` already does exactly this — it regex-matches verse references and wraps them in `<VerseLink>`. We just need to use it instead of raw text rendering.

### Changes

| File | Change |
|------|--------|
| `src/components/bible/JournalPanel.tsx` | Import `renderWithVerseLinks`, replace `{(entry as any).typed_text}` plain text rendering on line 287 with `renderWithVerseLinks((entry as any).typed_text)` |
| `src/components/bible/BiblePocketSheet.tsx` | Same treatment for any journal entry text previews rendered in the Journal and Search tabs |

Two lines of actual change. The `renderWithVerseLinks` utility and `VerseLink` component already handle all the interaction, tooltip fetching, and mobile bottom-sheet behavior.

