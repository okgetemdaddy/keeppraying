

# Dual-Mode Bible Highlighting: Dynamic Inversion + Neon Accent

## Problem

Current highlights use low-opacity background tints (`bg-yellow-400/20` in dark mode) which muddy into the dark background, making highlighted text harder to read rather than easier — the "dimmer" effect.

## What Gets Built

Replace the single highlight style map with a **dual-mode system** offering two distinct highlight rendering strategies. The user's active theme (light/dark) determines which mode is used automatically.

### Mode 1: Dynamic Text Inversion (Light Mode + Dark Mode default)

- **Background**: High-opacity legible color block (e.g., `#FFD700` yellow, `#34D399` green)
- **Text color**: Forced near-black (`#121212`) inside the `<mark>` element
- **Result**: Text pops forward with maximum contrast and readability

### Mode 2: Neon Accent (Dark Mode alternative — user toggle)

- **Background**: Highly desaturated, low-light tint (e.g., `#2A2A1A` for yellow)
- **Accent**: Vibrant `border-bottom: 2px solid <color>` underline
- **Text color**: Unchanged (inherits reading canvas color)
- **Result**: Passage is clearly marked without disrupting dark-mode eye comfort

## Technical Details

### 1. New highlight color map (`BibleReader.tsx`)

Replace `HIGHLIGHT_COLORS` with a structured map:

```ts
const HIGHLIGHT_STYLES: Record<string, {
  light: string;       // light-mode classes
  darkInvert: string;  // dark-mode inversion (bg + forced text color)
  darkNeon: { bg: string; border: string }; // dark-mode neon accent
}> = {
  yellow: {
    light: "bg-yellow-200/70",
    darkInvert: "bg-[#FFD700] text-[#121212]",
    darkNeon: { bg: "bg-[#2A2A1A]", border: "border-b-2 border-[#FFD700]" },
  },
  green: { ... },
  blue: { ... },
  pink: { ... },
  purple: { ... },
  orange: { ... },
};
```

### 2. Update `HighlightedText` component

- Accept a new `highlightStyle` prop: `"invert" | "neon"`
- Compute the correct class string per `<mark>` based on the current theme (detect via `document.documentElement.classList.contains("dark")` or a context value) and the chosen style mode
- For **invert**: apply bg color + forced text color override
- For **neon**: apply desaturated bg + bottom border accent, no text color change

### 3. State & persistence

- Add `highlightStyle` state to `BibleReader.tsx` with localStorage key `bible_highlight_style`, default `"invert"`
- Pass to `HighlightedText` and expose in the Bible Sleeve settings

### 4. Bible Sleeve UI (`BibleSleeveSheet.tsx`)

Add a small toggle in the existing highlight/annotation section:
- Two-option segmented control: **"Bold"** (invert) / **"Subtle"** (neon)
- Only visible when dark mode is active (in light mode, inversion is always used)

### 5. Files Changed

| File | Change |
|------|--------|
| `BibleReader.tsx` | New `HIGHLIGHT_STYLES` map, `highlightStyle` state, updated `HighlightedText` component |
| `BibleSleeveSheet.tsx` | Add highlight style toggle (dark mode only) |

