

## Bible Reader: Mobile Toolbar + "Bible Sleeve" Side Sheet + First-Click Tour + Suggestion Form

### Overview

Three interconnected changes: (1) mobile verse toolbar becomes a bottom sheet instead of a floating div, (2) a slide-out "Bible Sleeve" sheet accessible via a left-arrow button contains all Bible settings/features/annotations, and (3) a first-click feature tour sheet with suggestion flow.

---

### 1. Mobile Floating Toolbar → Bottom Sheet

**File: `src/components/bible/FloatingToolbar.tsx`**

- Detect `isMobile` (already imported)
- On mobile, wrap the toolbar content in a `Sheet` (side="bottom") instead of the floating `motion.div`
- The sheet auto-opens when `selectedVerses.length > 0` and closes on dismiss
- Same color swatches, bookmark, note, bunch buttons — just laid out in a wider bottom sheet with more breathing room
- Desktop keeps the current floating toolbar unchanged

### 2. "Your Bible Sleeve" — Left Slide-Out Sheet

**New file: `src/components/bible/BibleSleeveSheet.tsx`**

A Sheet (side="left") triggered by a left-arrow `←` button in the Bible toolbar area. Contains:

- **Header**: "Hello, [user first name or 'friend']! Welcome to Your Bible Sleeve"
- **Sections** (gracefully designed with icons, dividers):
  - **Text Size** — slider (same as current popover, duplicated here)
  - **Reading Mode** — verse/paragraph toggle
  - **Cross-Translation** — globe toggle with explanation
  - **Hide/Show Bunches** — eye toggle
  - **Your Highlights** — list of highlighted verses grouped by color, clickable to navigate
  - **Your Bookmarks** — list of bookmarked verses, clickable
  - **Your Notes** — list of notes with previews, clickable
  - **Your Verse Bunches** — full list of all bunches (replaces the top strip for previous bunches), each clickable to navigate
- Data comes from existing queries (`useBibleChapterData`, `useUserVerseBunches`) — passed as props

**File: `src/components/bible/BibleReader.tsx`**

- Add a `←` (ChevronLeft or ArrowLeft) button at the left side of the toolbar
- On click, opens the Bible Sleeve sheet
- **Verse Bunch strip at top**: only shows the most recently created/active bunch (not all bunches). All bunches accessible in the Sleeve.
- Move text size popover,