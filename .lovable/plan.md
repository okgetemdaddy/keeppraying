

# Fix: Replace All Plain-Text Verse References with VerseLink Components

## Problem
Multiple pages render Scripture references as plain text strings (e.g., `"…" — Matthew 18:20`) instead of using the `<VerseLink>` component that provides hover/tap AI summaries. This is inconsistent with the app's established pattern.

## Files Requiring Changes (10 files, ~10 edits)

### 1. `src/pages/Groups.tsx` (line 119)
- Plain text: `— Matthew 18:20`
- Add `import VerseLink` and replace with `<VerseLink reference="Matthew 18:20" />`

### 2. `src/pages/GroupDetail.tsx` (line 278)
- Plain text: `— Galatians 6:2`
- Add `import VerseLink` and replace with `<VerseLink reference="Galatians 6:2" />`

### 3. `src/pages/FamilyRooms.tsx` (line 94)
- Plain text: `— Proverbs 22:6`
- Add `import VerseLink` and replace with `<VerseLink reference="Proverbs 22:6" />`

### 4. `src/pages/AccountabilityCircles.tsx` (lines 144, 191)
- Two plain text verses: `— Proverbs 27:17` and `— Galatians 6:2`
- Add `import VerseLink` and replace both

### 5. `src/pages/CircleDetail.tsx` (line 261)
- Plain text: `— 1 Thessalonians 5:11`
- Add `import VerseLink` and replace

### 6. `src/pages/SermonSync.tsx` (line 354)
- Plain text: `— Psalm 119:105`
- Add `import VerseLink` and replace

### 7. `src/pages/Board.tsx` (line 815)
- Plain text: `— Matthew 6:6`
- Add `import VerseLink` and replace (note: this one uses inline `style` for color, so VerseLink will need the className override pattern like Auth/ResetPassword pages use)

### 8. `src/components/map/GrowthCTA.tsx` (lines 110-112)
- Plain text: `— Matthew 18:20` (white-on-dark styling)
- Add `import VerseLink` and replace with className overrides for white text

### 9. `src/components/admin/AIInsightsTab.tsx` (line 273)
- Dynamic verse text rendered as plain `<p>` — wrap with `renderWithVerseLinks()` so any verse references in AI-generated content become interactive

### 10. `src/pages/Testify.tsx`
- No plain-text verse found in the page itself (verses come from user content). No change needed.

## Pattern
Each fix follows the same structure:
```tsx
// BEFORE
<p className="verse-text text-xs">"Quote text…" — Book Chapter:Verse</p>

// AFTER  
<p className="verse-text text-xs">"Quote text…" — <VerseLink reference="Book Chapter:Verse" /></p>
```

For dark/themed backgrounds, use the className override pattern already established:
```tsx
<VerseLink reference="Matthew 6:6" className="[&_.verse-text]:text-white/60 [&>span]:bg-white/10 [&>span]:border-white/20" />
```

## Scope
- 9 files modified
- Each file: add `import VerseLink` (if not present) + swap plain text reference → `<VerseLink>`
- No new components, no database changes, no edge functions

