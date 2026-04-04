

## Move InkOverlay Pointer Capture to Window

### Problem
The SVG has `touchAction: "pan-y"` but this applies to ALL pointer types equally. Apple Pencil vertical strokes get interpreted as scroll gestures instead of drawing. CSS cannot distinguish between pen and touch.

### Solution
Make the SVG a pure rendering surface (`pointerEvents: "none"`). Attach pointer listeners to `window` so we can selectively call `preventDefault()` for pen events while letting touch events flow through for native scrolling.

### Changes

**`src/components/bible/InkOverlay.tsx`** — 4 edits:

1. **SVG element** (line 631-648): Remove all `onPointer*` handlers. Change style to `pointerEvents: "none"`, remove `touchAction`. Keep `cursor: "crosshair"` and `overflow: "visible"`.

2. **Remove React pointer handler functions** (lines 246-561): Delete `handlePointerDown`, `handlePointerMove`, `handlePointerUp`, `handlePointerLeave`, `handlePointerCancel` callback definitions.

3. **Add window pointer listeners useEffect**: A single `useEffect` that attaches `pointerdown`, `pointermove`, `pointerup`, `pointercancel` to `window` with `{ passive: false }`. Logic:
   - `onDown`: pen → `e.preventDefault()` + start drawing. Touch → palm rejection check, if `!fingerDrawing` return (let browser scroll), if fingerDrawing + `!e.isPrimary` return, else `e.preventDefault()` + start drawing. Mouse → return.
   - `onMove`: pen hover (pressure===0, not drawing) → update hover cursor. If drawing, capture coalesced points.
   - `onUp`: finalize stroke — all existing gesture detection logic (circle, word circle, X, underline, verse linking, compression, `onStrokeComplete`) stays identical.
   - `onCancel`: reset drawing state.
   - Deps: `[fingerDrawing, getTransformedPoint, renderLoop, penColor, penSize, penGlow, zoom, onStrokeComplete, onCircleSelect, onWordCircle, onUnderlineGesture, onXGesture, onUndo, onPencilFirstContact]`

4. **Remove ResizeObserver** (lines 162-181): Delete the `canvasSize` state and ResizeObserver `useEffect`. Change SVG to use `width="100%" height="100%"` with no viewBox (lines 625-629).

5. **Stroke click handlers on rendered paths** (line 609-611): These need `pointerEvents: "auto"` on each path since the SVG itself is `pointerEvents: "none"`. Actually, per the user's earlier instruction to remove stroke selection, remove the `onClick` and `cursor-pointer` from rendered strokes entirely.

### Files
| File | Changes |
|------|---------|
| `src/components/bible/InkOverlay.tsx` | Move pointer capture to window, SVG becomes render-only, remove ResizeObserver |

No changes needed to BibleReader.tsx or ZoomWrapper.tsx — those were already fixed in the previous round.

