

# Fix: Ink Overlay Must Span Full Grid (Text + Margins)

## Problem

In `ZoomWrapper.tsx`, all `children` (including `InkOverlay`) are rendered inside the text column cell:

```text
┌─────────────────────────────────────────┐
│ [Text + InkOverlay]  │  [Margin Space]  │  ← InkOverlay trapped in text cell
└─────────────────────────────────────────┘
```

The user can only draw on the text column, not the margin writing space. This defeats the purpose of the spatial canvas.

## Solution

Add an `overlay` prop to `ZoomWrapper` that renders **inside the grid container** but spans all columns via `position: absolute; inset: 0`. This way the SVG ink surface covers the entire width (text + margins).

### Change 1: `ZoomWrapper.tsx`

- Add `overlay?: React.ReactNode` prop
- Render `overlay` as a sibling to the grid cells, positioned `absolute inset-0` with `pointer-events: auto` and spanning the full container
- The existing `children` stay inside the text column cell (verses only)

```text
┌──────────────────────────────────────────┐
│ ┌─────────────┐  ┌───────────────────┐   │
│ │ Text column  │  │  Margin (dots/    │   │
│ │ (verses)     │  │  lines/blank)     │   │
│ └─────────────┘  └───────────────────┘   │
│ ┌────────────────────────────────────┐   │
│ │     InkOverlay (absolute, full)    │   │  ← spans everything
│ └────────────────────────────────────┘   │
└──────────────────────────────────────────┘
```

### Change 2: `BibleReader.tsx`

- Move `<InkOverlay>` from being a child of `<ZoomWrapper>` to the new `overlay` prop:

```tsx
<ZoomWrapper
  zoom={...}
  textAlign={...}
  marginWidth={...}
  canvasBackground={...}
  overlay={
    studyMode && studyModeVariant === "margin" && (
      <InkOverlay ... />
    )
  }
>
  <section>
    {verses.map(...)}
  </section>
</ZoomWrapper>
```

### Files Changed

| File | Change |
|------|--------|
| `ZoomWrapper.tsx` | Add `overlay` prop, render it absolute over the full grid |
| `BibleReader.tsx` | Move `InkOverlay` from children to `overlay` prop |

No other changes needed — the SVG coordinate system (`getScreenCTM().inverse()`) will automatically map to the full container width since the SVG now spans the entire grid.

