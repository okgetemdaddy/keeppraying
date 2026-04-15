

## Wire Margin Mode Events to Session Telemetry

### Current State

| Handler | Has `logEvent`? | Source field |
|---------|----------------|-------------|
| `handleMarginStrokeComplete` (line 1569) | ✅ Yes | `source: 'margin_pencil'` |
| Margin underline → `currentLogEvent` (line 3363/3367) | ✅ Yes | `source: 'margin_pencil_underline'` |
| Margin `onCircleSelect` (line 3372) | ❌ Missing | — |
| `handleMarginXGesture` (line 1578) | ❌ Missing | — |

Two gaps to fix. No schema migration needed — reuses existing event types with `source` in payload.

### Changes — `src/components/bible/BibleReader.tsx`

**1. Add `logEvent` to `handleMarginXGesture` (line 1585, after the toast)**

```typescript
readingTelemetry.logEvent('ink_erased', {
  source: 'margin_mode',
  erased_count: strokeIds.length,
});
```

Add `readingTelemetry` to the dependency array.

**2. Add `logEvent` to margin `onCircleSelect` inline handler (line 3387, after the toast)**

```typescript
currentLogEvent('circle_select', {
  verse_numbers: verseNumbers,
  source: 'margin_mode',
});
```

**3. Normalize `source` field values** — The stroke complete currently uses `'margin_pencil'` and underline uses `'margin_pencil_underline'`. For consistency with the plan and AI synthesis readability, standardize:

- Stroke complete (line 1572): change `'margin_pencil'` → `'margin_mode'`
- Underline (lines 3363, 3367): change `'margin_pencil_underline'` → `'margin_mode'` (the event type `highlight_added` + `source: 'margin_mode'` is sufficient to distinguish from tap-highlight which has no `source` field, and from canvas pencil underline which would use `source: 'pencil_underline'`)

This gives the AI synthesis a single clean signal: `source === 'margin_mode'` means "the user was writing in the margins of the reading view with Apple Pencil."

### Summary
- 2 new `logEvent` calls (X-gesture, circle-select)
- 4 source field normalizations → all margin events use `source: 'margin_mode'`
- 0 schema changes
- 0 new files

