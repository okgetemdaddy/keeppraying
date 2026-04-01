

# Mode 3: Linked Slide-Out Rich Journal

## Overview

A slide-out journal panel that opens from the right side of the Bible reader. Users can handwrite freeform notes using the `HandwritingEngine` (variant="journal") linked to the current chapter/verse. The journal feels like a leather-bound notebook page — rich paper texture, generous writing space, and automatic verse linking.

## New Component: `src/components/bible/JournalPanel.tsx`

A slide-out drawer (Sheet from right, 85% width on mobile, 480px on desktop) containing:

- **Header**: Chapter title + close button + save indicator
- **Verse context strip**: Shows the current verse or selected verses as a subtle reference at the top
- **HandwritingEngine**: `variant="journal"`, full height, `showToolbar=true`, with the journal's deeper shadow styling
- **Typed notes area**: A `textarea` below the drawing canvas for users who want to type alongside their handwriting (stored as a `typed_text` field — we'll add this column)
- **Entry list**: When the journal opens, show a scrollable list of previous journal entries for this chapter (pulled from annotations where `verse_ids` contains `{book}.{chapter}.journal`), each showing a small SVG preview thumbnail + timestamp. Tapping an entry loads it into the engine for editing.
- **New entry button**: Creates a fresh canvas

### Data keying
- Journal entries use `verse_ids: ["{book}.{chapter}.journal"]` to distinguish from margin/canvas annotations
- If a verse is selected when the journal opens, also include that verse ID so entries can be filtered per-verse later

## Database Migration

Add a `typed_text` column to the existing `annotations` table:

```sql
ALTER TABLE public.annotations ADD COLUMN IF NOT EXISTS typed_text text;
```

This allows journal entries to have both handwritten strokes AND typed text.

## `useAnnotations.ts` Updates

- Add `useJournalAnnotations(bookUsfm, chapterNumber)` — fetches annotations where any `verse_ids` entry ends with `.journal`
- Update `saveAnnotation` mutation to accept optional `typedText` parameter

## `BibleReader.tsx` Updates

- Add `journalOpen` state (boolean)
- When `studyModeVariant === "journal"` and study mode is on, the PenTool toolbar button opens the journal panel
- Handle variant change: `if (v === "journal" && studyMode) setJournalOpen(true)`
- Pass journal props to the new `JournalPanel`

## `BibleSleeveSheet.tsx` Updates

- Remove `disabled` and "Coming soon" from the Journal mode button
- Enable clicking it to set variant to `"journal"`

## Files Changed

1. **New**: `src/components/bible/JournalPanel.tsx` — slide-out journal with HandwritingEngine + typed notes + entry list
2. **Migration**: Add `typed_text` column to `annotations`
3. **Edit**: `src/hooks/useAnnotations.ts` — add `useJournalAnnotations`, update save mutation for `typedText`
4. **Edit**: `src/components/bible/BibleReader.tsx` — `journalOpen` state, variant handling, render `JournalPanel`
5. **Edit**: `src/components/bible/BibleSleeveSheet.tsx` — enable Journal mode button

## Technical Notes

- Journal uses the same `annotations` table — differentiated by the `.journal` suffix in `verse_ids`
- The `HandwritingEngine` already supports `variant="journal"` with deeper shadow styling
- Sheet component from `@/components/ui/sheet` used for the slide-out panel (opens from right)
- SVG thumbnail previews rendered by dangerouslySetInnerHTML from the stored `svg` field

