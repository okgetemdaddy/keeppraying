

## Wire Margin Mode Events to Session Telemetry

### Context
The MarginAnnotationLayer component has not been implemented yet (the previous plan was approved but not yet executed). This plan covers the telemetry wiring that must be included **as part of** the MarginAnnotationLayer implementation in BibleReader.tsx.

### File: `src/components/bible/BibleReader.tsx`

**1. `handleMarginStrokeComplete` callback** — when creating this handler, include the telemetry call:
```typescript
const handleMarginStrokeComplete = useCallback((stroke: MarginInkStroke) => {
  // ... save stroke to marginStrokes state + persist via annotation mutation ...
  
  logEvent('ink_stroke', {
    annotation_key: `${bookUsfm}.${chapterIdx + 1}.margin_ink`,
    stroke_count: marginStrokes.length + 1,
    source: 'margin_mode',
  });
}, [/* deps */]);
```
Uses `logEvent` from the existing reading session telemetry (not `canvasTelemetry` which is for canvas sessions). The `source: 'margin_mode'` field distinguishes from canvas ink (`source` absent or `'canvas'`).

**2. Underline-to-highlight** — already wired. The existing underline handler at ~line 3055 already logs `highlight_added` with `source: 'pencil_underline'`. Since margin mode reuses this same handler, no change needed. The `source: 'pencil_underline'` field is sufficient — the AI synthesis can infer margin vs canvas from the session type context.

**3. Circle-to-select** — already wired through existing handler. No change needed.

**4. `handleMarginXGesture` callback** — when creating this handler, include the telemetry call:
```typescript
const handleMarginXGesture = useCallback((deletedStrokeIds: string[]) => {
  // ... remove strokes from marginStrokes state + persist ...
  
  logEvent('ink_erased', {
    source: 'margin_mode',
    erased_count: deletedStrokeIds.length,
  });
}, [/* deps */]);
```

**5. No schema migration needed.** Reuses existing `ink_stroke` and `ink_erased` event types with the `source` field in the JSON payload to distinguish margin vs canvas. The SessionDetailDashboard's Study Analytics module (Module 3) will read the `source` field from event payloads when computing tool breakdowns.

### Summary
- 2 new telemetry calls in 2 new callbacks (`handleMarginStrokeComplete`, `handleMarginXGesture`)
- 0 existing handlers modified
- 0 schema changes
- All wired as part of the pending MarginAnnotationLayer implementation

