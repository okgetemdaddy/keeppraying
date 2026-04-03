

# Extend "Ease the Eyes" to All Bible UI Elements

## Change

**`src/index.css`** (lines 336–341) — Replace the narrow `.bible-reading-canvas` selectors with a broad `.bible-dark` selector that dims **all** text elements: reading canvas, Bible Sleeve drawer, toolbar, header, buttons, labels — everything inside the `.bible-dark` scope.

```css
/* ═══ Ease the Eyes — solid color-mix dimmer ═══ */
:root { --ease-eyes-dim: 1; }

.bible-dark p,
.bible-dark span,
.bible-dark sup,
.bible-dark h1,
.bible-dark h2,
.bible-dark h3,
.bible-dark h4,
.bible-dark label,
.bible-dark a,
.bible-dark button,
.bible-dark input,
.bible-dark textarea,
.bible-dark select,
.bible-dark li,
.bible-dark td,
.bible-dark th,
.bible-dark div {
  color: color-mix(in srgb, #f4f4f5 calc(var(--ease-eyes-dim) * 100%), #09090b);
  transition: color 0.1s linear;
}

/* Protect SVG ink layers and highlighters from dimming */
.bible-dark svg,
.bible-dark .highlighter-layer {
  color: unset;
}
```

This ensures the slider dims every text element across the entire Bible interface — scripture, sleeve panels, toolbars, headers, buttons — while keeping ink/SVG layers untouched. Only one file changes.

| File | Change |
|------|--------|
| `src/index.css` | Broaden `color-mix()` selectors from `.bible-reading-canvas` to all `.bible-dark` text elements |

