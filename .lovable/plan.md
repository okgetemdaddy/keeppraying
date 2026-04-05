

## Custom Icons & Search Placeholder Update

### 1. Create Custom SVG Icon Components

**New file: `src/components/bible/BibleSightIcon.tsx`**

A sparkle layered in front of an open book. The open book matches the KeepPray.ing logo style — a simple, elegant open book silhouette (two fanned pages meeting at a spine). A 4-pointed sparkle sits at the upper-right area of the book.

**New file: `src/components/bible/DeepStudyIcon.tsx`**

An anchor centered over/in front of the same open book silhouette. The anchor represents depth and grounding in Scripture.

Both components accept standard `size`, `className`, and `color` props (matching Lucide conventions) for drop-in use anywhere icons are currently used.

### 2. Replace Lucide Icons with Custom Icons

**File: `src/components/bible/BibleReader.tsx`**

- Import `BibleSightIcon` and `DeepStudyIcon`
- Replace any `Eye`/`Sparkles` icons used for Bible Sight and Deep Study toolbar buttons with the new custom components

**File: `src/components/bible/BibleSleeveSheet.tsx`**

- Replace the icons next to "Bible Sight" and "Deep Study" labels in the Sleeve menu with the new custom SVG components

### 3. Update Search Placeholder

**File: `src/components/bible/BibleReader.tsx`** (line 2718)

Change placeholder from `"What can I help you find?"` to `"Where is Easter found in the Bible?"`

### Files Changed

| File | Change |
|------|--------|
| `src/components/bible/BibleSightIcon.tsx` | New — sparkle + open book SVG component |
| `src/components/bible/DeepStudyIcon.tsx` | New — anchor + open book SVG component |
| `src/components/bible/BibleReader.tsx` | Use new icons; update search placeholder |
| `src/components/bible/BibleSleeveSheet.tsx` | Use new icons in Sleeve menu items |

