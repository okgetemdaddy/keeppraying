

# "Living Ink" Visual Polish Pass

## What This Is

A visual refinement of our existing `perfect-freehand` SVG engine — NOT an architecture change. The core engine already implements everything the audit describes. This adds the premium aesthetic layer.

## Changes

### 1. Ink-Bleed Filter (`InkOverlay.tsx`)
Add an SVG `<filter>` definition for committed strokes:
```xml
<filter id="ink-bleed">
  <feGaussianBlur stdDeviation="0.3" />
  <feComponentTransfer>
    <feFuncA type="linear" slope="0.95" />
  </feComponentTransfer>
</filter>
```
Apply `filter="url(#ink-bleed)"` to committed stroke paths (not live preview).

### 2. Premium Color Palette (`iPadStudyToolbar.tsx`)
Replace current 5-color palette with curated ink tones:
- Iron Gall Black: `#1A1A1A` (already default)
- Oxblood Red: `#4A0E0E`
- Royal Blue: `#0f4d9c` (keep)
- Faded Sepia: `#D4C4A8` with `mix-blend-mode: multiply` + `opacity: 0.6` (highlighter mode)
- Forest Green: `#0f9c4d` (keep)

### 3. Calligraphic Taper (`InkOverlay.tsx`)
Update `STROKE_OPTIONS` to add subtle start/end tapers:
```ts
start: { taper: 12, easing: (t) => t * t },
end:   { taper: 8,  easing: (t) => t },
```
This gives strokes a natural entry/exit like a fountain pen lifting off paper.

### 4. Paper Tone (Theme-Aware)
In the Bible reader's study mode, apply `bg-[#FDFBF7]` for light theme only (dark themes keep current background). Add via a CSS class on the `ZoomWrapper` container.

### 5. Auto-Hide Toolbar During Strokes (`iPadStudyToolbar.tsx`)
When `isPencilActive` is true (passed as prop), fade the toolbar to 0 opacity with a 150ms transition. Reappear on stroke end. Clean, distraction-free writing.

## Files Modified

| File | Change |
|------|--------|
| `src/components/bible/InkOverlay.tsx` | Add ink-bleed SVG filter, update taper values, add sepia blend mode for highlighter color |
| `src/components/bible/iPadStudyToolbar.tsx` | Update color palette, add auto-hide during active drawing |
| `src/components/bible/ZoomWrapper.tsx` | Add paper-tone background class in light theme |

No database changes. No new dependencies. Pure visual refinement.

