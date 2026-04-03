

# Suggestions Pill + Drawer on Bible Toolbar

## What this does
Adds a dark-themed "Suggestions" pill to the left of the existing iPad App pill on the toolbar break bar. Clicking it opens a redesigned suggestion drawer with a spacious writing area (pencil-friendly with auto-OCR), a type option, heartfelt copy about prayerful consideration of suggestions and bug reports, and submission to `feedback_submissions`.

## Technical changes

### 1. New component: `src/components/bible/SuggestionBanner.tsx`

- Identical structure to `iPadWaitlistBanner.tsx` — rotated -90°, hangs from toolbar break bar
- Dark mode styling: `bg-slate-800 dark:bg-slate-900 border-slate-600/50 text-slate-200`
- Positioned at `left-[12%]` (to the left of the iPad pill at `left-[20%]`)
- Uses `Lightbulb` icon + "Suggestions" uppercase text
- No dismiss logic — always visible

### 2. Redesign `src/components/bible/BibleSuggestionSheet.tsx`

Complete rewrite of the existing sheet into a premium left-side drawer:

- **Side**: `side="left"` (drawer flies out from left)
- **Writing space section**: Large textarea (min-h-[200px]) styled as a clean writing canvas with subtle dot-grid background — pencil-friendly on iPad
- **Auto-OCR note**: Small label "Apple Pencil supported — handwriting auto-converts to text ✏️"
- **Type toggle**: Small "Prefer to type?" link that switches to standard keyboard input mode
- **Title input**: Optional, compact
- **Category toggle**: "Suggestion" or "Bug Report" pill selector
- **Heartfelt copy section** with clean SVG accents:
  - "Every suggestion is prayerfully considered by our team."
  - "We're constantly fine-tuning KeepRead.ing because we love the Word of God and want to interact with it as deeply as possible."
  - "All suggestions welcome — and bugs reported here are fixed as soon as we know about them."
  - "Thank you for blessing this ministry. 🙏"
- **Submit button**: `Send` icon, full width
- **Thank-you state**: Heart icon with blessing message, auto-close after 2.5s
- Submits to existing `feedback_submissions` table with `feedback_type: "bible_suggestion"` or `"bible_bug"`

### 3. Wire into `BibleReader.tsx`

- Add `suggestionDrawerOpen` state
- Import and render `SuggestionBanner` at `left-[12%]` inside the toolbar `relative` container (before the iPad pill)
- Import and render `BibleSuggestionSheet` with `open={suggestionDrawerOpen}`
- Show on all devices (not just iPad)

## Files changed

| File | Change |
|------|--------|
| `src/components/bible/SuggestionBanner.tsx` | New — dark pill hanging from toolbar |
| `src/components/bible/BibleSuggestionSheet.tsx` | Rewrite — premium left drawer with writing space, OCR, category toggle, heartfelt copy |
| `src/components/bible/BibleReader.tsx` | Wire suggestion state + render banner and drawer |

