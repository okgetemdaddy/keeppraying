

# Insert Native Port Technical Notes

## Summary

Embed detailed developer-only comments across 4 key files documenting the native iPadOS migration blueprints. These are block comments with a `@native-port` tag — invisible to end users, only meaningful to engineers during a future Capacitor/Swift transition.

## Files & Placement

### 1. `src/components/bible/InkOverlay.tsx` — Top of file (after imports)
Insert a block comment documenting:
- The "Transparent Glass" pattern: overlay a native `PKCanvasView` over `WKWebView`, keeping DOM for typography and native layer for ink
- The full Swift `PencilKitBridge` Capacitor plugin scaffold (class, delegate, base64 serialization back to React)
- 120Hz coalesced/predicted touch extraction via `UIEvent.coalescedTouches` and `predictedTouches`
- Note that the current RAF+SVG approach hits a theoretical ceiling vs native 9ms latency

### 2. `src/components/bible/iPadStudyToolbar.tsx` — Top of file (after imports)
Insert a block comment documenting:
- `UIPencilInteraction` delegate for barrel double-tap and Pencil Pro squeeze (iOS 17.4+)
- The Swift→JS event pipeline via `evaluateJavaScript` dispatching `CustomEvent('pencilDoubleTap')`
- React listener pattern for toggling pen/eraser and notifying the native plugin

### 3. `src/lib/convexHull.ts` — Top of file (after existing JSDoc)
Insert a block comment documenting:
- Circle-to-Lexicon upgrade: intersect `<span data-strongs>` elements inside the hull polygon
- Strong's number extraction and lexicon API query pattern
- CSS `lexicon-highlight` animation trigger on matched word spans

### 4. `src/hooks/useAnnotations.ts` — Top of file (after imports)
Insert a block comment documenting:
- Native ink serialization: `PKDrawing.dataRepresentation()` → base64 → stored alongside web stroke JSON
- Bidirectional sync: web strokes render in SVG, native strokes render in `PKCanvasView`
- The `onNativeInkUpdated` Capacitor listener pattern for real-time persistence

## Format

All comments use this pattern:
```typescript
/**
 * @native-port — INTERNAL ENGINEERING NOTES (not user-facing)
 * ─────────────────────────────────────────────────────────
 * [content]
 */
```

No runtime code changes. No UI changes. No behavioral changes.

