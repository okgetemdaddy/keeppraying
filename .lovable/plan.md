

# "Ease the Eyes" Dimmer + Collapsible Bible Sleeve Sections

## Feature 1: "Ease the Eyes" Slider

A dimming slider that sits between Premium Dark Mode and True Black OLED in the Appearance section. When active (only available when Premium Dark is on), it reduces the opacity/brightness of all non-background elements (text, icons, borders, cards) — making late-night reading gentler.

### Implementation

**`src/index.css`** — Add a CSS custom property `--ease-eyes-dim` and apply it:
```css
.bible-dark {
  --ease-eyes-dim: 1;
}
.bible-dark .bible-ease-eyes-target {
  opacity: var(--ease-eyes-dim);
}
```
The dimming will be applied via a CSS filter on the reader content area: `filter: brightness(var(--ease-eyes-dim))` — this dims everything (text, highlights, icons) without touching the background.

**`src/components/bible/BibleReader.tsx`**:
- Add `easeEyesDim` state (0.4–1.0, default 1.0) persisted to localStorage key `bible_ease_eyes`
- Apply `style={{ filter: brightness(${easeEyesDim}) }}` to the reader content wrapper (not the background)
- Pass value + setter to BibleSleeveSheet

**`src/components/bible/BibleSleeveSheet.tsx`**:
- Add new props: `easeEyesDim: number`, `onEaseEyesDimChange: (v: number) => void`
- Insert a slider between Premium Dark and True Black OLED rows, disabled when dark mode is off
- Label: "Ease the Eyes" with icon (Eclipse/EyeOff), description: "Dim text and UI elements for comfortable night reading"
- Slider range: 0.4 to 1.0, step 0.05

## Feature 2: Collapsible Sections in Bible Sleeve

Wrap each section (Text Size, Reading Mode, Toggles, Appearance, Highlights, Bookmarks, Notes, Verse Bunches) in a `Collapsible` component so users can collapse/expand them. Persist collapsed state in localStorage.

### Implementation

**`src/components/bible/BibleSleeveSheet.tsx`**:
- Import `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` from `@/components/ui/collapsible`
- Import `ChevronDown` icon
- Add state: `collapsedSections` as a `Set<string>`, initialized from localStorage key `bible_sleeve_collapsed`
- Toggle function that updates state + persists to localStorage
- Wrap each `<section>` in `<Collapsible>`:
  - The `<h3>` header becomes the `<CollapsibleTrigger>` with a rotating chevron
  - Section content goes inside `<CollapsibleContent>`
- Sections to make collapsible: Text Size, Reading Mode, Toggles, Appearance, Immersive Mode, Highlights, Bookmarks, Notes, Verse Bunches
- Keep Trash Bin always visible (not collapsible)

### Files Changed
1. `src/index.css` — brightness filter class
2. `src/components/bible/BibleReader.tsx` — easeEyesDim state + pass to sleeve + apply filter
3. `src/components/bible/BibleSleeveSheet.tsx` — slider UI + collapsible sections

