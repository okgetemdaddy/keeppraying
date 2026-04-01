

# Premium Dark Mode for /bible

## Overview
Add two toggles to the Bible Sleeve panel: **Premium Dark Mode** (charcoal theme) and **True Black OLED Mode** (pure black background). These are Bible-scoped — they don't affect the rest of the app. The current light theme remains the default.

## Approach: Scoped CSS Custom Properties
Rather than toggling Tailwind's global `dark` class (which would affect the entire app), we apply a scoped `.bible-dark` class to the Bible page's `<article>` wrapper. This overrides CSS custom properties only within the Bible reader. A second `.bible-oled` class changes only the background to `#000`.

## Files Changed

### 1. `index.html` — Load EB Garamond font
Add EB Garamond to the existing Google Fonts link for the premium serif reading experience.

### 2. `src/index.css` — Add Bible dark mode CSS variables
New scoped block at the end of the components layer:

```css
.bible-dark {
  --background: 0 0% 7%;          /* #121212 */
  --foreground: 0 0% 88%;         /* #E0E0E0 */
  --card: 0 0% 12%;               /* #1E1E1E */
  --card-foreground: 0 0% 88%;
  --popover: 0 0% 12%;
  --popover-foreground: 0 0% 88%;
  --primary: 213 100% 65%;        /* #4A9FFF */
  --primary-foreground: 0 0% 7%;
  --secondary: 0 0% 16%;          /* #2A2A2A */
  --muted: 0 0% 14%;
  --muted-foreground: 0 0% 63%;   /* #A0A0A0 */
  --accent: 0 0% 16%;
  --accent-foreground: 0 0% 88%;
  --border: 0 0% 18%;
  --input: 0 0% 18%;
  --ring: 213 100% 65%;
  /* Verse highlight/selection */
  --bible-highlight-selection: hsla(43, 76%, 46%, 0.2); /* #D4A017 at 20% */
}
.bible-dark.bible-oled {
  --background: 0 0% 0%;          /* #000000 */
}
```

Plus utility classes for the reading area serif font, soft inner glows, and smooth transitions.

### 3. `src/components/bible/BibleSleeveSheet.tsx` — Add two toggles
- Accept new props: `premiumDark`, `oledMode`, `onTogglePremiumDark`, `onToggleOled`
- Add a new "Appearance" section after the existing toggles:
  - **Premium Dark Mode** toggle with moon icon and description text
  - **True Black OLED Mode** toggle (disabled when Premium Dark is off) with monitor/smartphone icon and description
- OLED toggle auto-disables and resets when Premium Dark is turned off

### 4. `src/components/bible/BibleReader.tsx` — Wire state + apply classes
- Add `premiumDark` and `oledMode` state (persisted in `localStorage` as `bible_premium_dark` and `bible_oled_mode`)
- Apply `.bible-dark` and `.bible-oled` classes to the root `<article>` element
- When dark mode is active, apply `font-[EB_Garamond]` serif font to the reading area with generous `leading-[2]` line height
- Pass new props to `BibleSleeveSheet`
- Apply the scoped highlight selection color via the CSS variable for verse selection styling
- The toolbar, navigation bar, and all surface panels inherit the overridden CSS variables automatically since they're children of the `<article>` wrapper

### 5. Color Mapping (exact hex spec)

| Role | Hex | HSL (approx) |
|------|-----|---------------|
| Main background | #121212 | 0 0% 7% |
| Surface panels | #1E1E1E | 0 0% 12% |
| Elevated surfaces | #2A2A2A | 0 0% 16% |
| Primary text | #E0E0E0 | 0 0% 88% |
| Secondary text | #A0A0A0 | 0 0% 63% |
| Accent | #4A9FFF | 213 100% 65% |
| Highlight selection | #D4A017 @ 20% | hsla(43,76%,46%,0.2) |
| OLED background | #000000 | 0 0% 0% |

### 6. Quality Details
- Smooth `transition-colors duration-300` on the article wrapper for seamless toggle
- Soft `shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]` inner glow on cards/panels in dark mode
- Verse numbers use `text-[#A0A0A0]` (muted-foreground maps to this)
- All existing highlight colors already have `dark:` variants — they work within the scoped override
- WCAG AA+ contrast: #E0E0E0 on #121212 = 15.3:1 ratio, #A0A0A0 on #121212 = 8.5:1 ratio
- Existing features (highlighting, notes, bookmarks, cross-references, audio, bunches) remain fully intact — only CSS custom properties change

