
Goal

Restore Apple Pencil Pro drawing in `/bible` study mode by making its event path behave like `/canvas`, where pointerdown is allowed to reach the ink layer without extra interception.

What I found

- `InkOverlay` is already in the simplified state from the earlier fix: it now uses `if (e.pressure === 0) return;` and no longer blocks on `e.button !== 0`.
- The old parent-level pen interception in `BibleReader` is already gone. The current study-mode effects only suppress single-finger touch scrolling and handle two-finger scrolling, so I would leave those alone.
- The remaining structural differences vs `/canvas` are:
  1. `ZoomWrapper`’s overlay wrapper is missing `touchAction: "none"` and user-selection suppression.
  2. The study reading surface still sits inside a `motion.div` with Framer Motion drag props. Even when drag resolves to `false`, that wrapper is still the most likely place pointerdown is getting intercepted before the SVG receives it.
- Since hover works, `pointermove` is reaching `InkOverlay`; the missing piece is confirming whether `pointerdown` ever reaches the SVG.

Implementation plan

1. `src/components/bible/ZoomWrapper.tsx`
   - Update the absolute overlay wrapper so it spans the grid exactly as it does now, but also adds:
     - `touchAction: "none"`
     - `WebkitUserSelect: "none"`
     - `userSelect: "none"`
   - This makes the whole overlay stack opt out of browser gesture/text-selection behavior before input reaches the SVG.

2. `src/components/bible/BibleReader.tsx`
   - Split the chapter content wrapper into two paths:
     - Study mode + `studyModeVariant === "margin"`: render the shared reading content inside a plain `<div>`.
     - All other modes: keep the existing `motion.div` with fade + chapter swipe drag behavior.
   - I would extract the shared `ZoomWrapper` + verses block once, then place it inside either wrapper so the diff stays small and behavior stays identical apart from removing Framer Motion from study mode.
   - Result: study mode keeps the same layout and ink overlay, but no longer has Framer Motion gesture listeners sitting above the drawing surface.

3. `src/components/bible/InkOverlay.tsx`
   - Add temporary diagnostics in two places:
     - At the top of `handlePointerDown`:
       `console.log('[INK] pointerdown', e.pointerType, 'pressure:', e.pressure, 'button:', e.button, 'target:', (e.target as Element).tagName);`
     - In the SVG prop itself, wrap `onPointerDown` so it logs first, then calls `handlePointerDown`.
   - This will immediately tell us whether the SVG is receiving the event at all, or whether interception is still happening higher in the tree.
   - These logs should stay only long enough to confirm the fix, then be removed in a cleanup pass.

Why this is the likeliest fix

```text
/canvas path:
plain container -> overlay wrapper -> InkCanvas SVG -> pointerdown -> setPointerCapture -> draw

current /bible likely path:
motion.div gesture system and/or overlay wrapper gesture negotiation -> pointerdown blocked before InkOverlay handler
```

Validation after implementation

- Test Apple Pencil Pro in `/bible` study mode:
  - hover dot still appears
  - raw `[INK-SVG]` pointerdown log fires
  - `[INK] pointerdown` log fires
  - first stroke begins immediately on light pencil contact
- Confirm normal touch behavior still works:
  - single-finger touch does not scroll while in study mode
  - two-finger scrolling still works
  - non-study chapter swipe navigation still works
- No changes needed on `/canvas`; it remains the reference implementation.

Files involved

- `src/components/bible/ZoomWrapper.tsx`
- `src/components/bible/BibleReader.tsx`
- `src/components/bible/InkOverlay.tsx`
