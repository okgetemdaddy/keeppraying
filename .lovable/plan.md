
Update the `/canvas` pinch implementation by moving semantic zoom off `@use-gesture` and onto raw iPad touch events in `src/components/bible/canvas/ZoomPanWrapper.tsx`.

1. Remove `onPinch` from the `useGesture(...)` handlers and delete the `pinch` config block entirely.
   - Keep `onDrag` for two-finger panning
   - Keep `onWheel` for desktop pan and ctrl/cmd semantic zoom

2. Expand the existing `useEffect` on `containerRef`:
   - keep Safari `gesturestart` / `gesturechange` suppression with `preventDefault()` and `{ passive: false }`
   - add raw `touchstart`, `touchmove`, `touchend`, and `touchcancel` listeners
   - track the previous two-touch distance with a local `lastDist`
   - on two-touch move, compute distance delta and map it to semantic font size updates using:
     `fontSizeRef.current + delta * 0.15`
   - clamp to `MIN_FONT` / `MAX_FONT`, round, and only call `onFontSizeChange` when the value changes
   - reset `lastDist` on end/cancel and clean up every listener on unmount

3. Keep `touchAction: "none"` on the outer container so Safari cannot claim the gesture for native page zoom.

4. Leave the rest of the architecture unchanged:
   - `CanvasBibleReader` still owns `fontSize`
   - the text already reads only `--canvas-font-size` and `--canvas-line-height`, so the CSS-variable semantic zoom path stays correct
   - `InkCanvas` already ignores touch pointers, so touch remains dedicated to canvas navigation while pen/mouse drawing still works

Technical notes:
- Use `fontSizeRef` inside the touch listeners to avoid stale state during pinch frames.
- Add `touchcancel` in addition to `touchend`; iPad interruptions can otherwise leave pinch state stuck.
- No other files need changes for this fix.
