

## Fix: New Sessions Loading Old Ink Strokes

### Problem
Ink annotations are stored per-chapter (keyed `GEN.1.ink`), not per-session. When a new canvas session is created for a chapter that already has ink, the `useEffect` at line 1140 loads those old strokes into `inkHistory`, causing them to appear on the fresh canvas.

### Fix

**`src/components/bible/BibleReader.tsx`** — Two changes:

1. **Clear ink on new session start (~line 3203, inside `onStartSession` callback)**:
   Add `inkHistory.replaceStrokes([])` when a new session begins from the `CanvasCreationDrawer`, so the canvas starts blank regardless of chapter-level ink in the DB.

2. **Guard the ink-load effect (~line 1140) to skip when a fresh session is active**:
   The `useEffect` that syncs `inkAnnotation` → `inkHistory` should not overwrite a blank canvas when `activeSessionId` exists and the session was just created (not resumed). Add a ref `isNewSession` that is set to `true` in `onStartSession` and `false` in `handleResumeSession`. The ink-load effect skips loading when `isNewSession.current` is `true`.

   For resumed sessions (`handleResumeSession`), ink loading proceeds normally since the user expects to see their previous work.

### Files
| File | Change |
|------|--------|
| `src/components/bible/BibleReader.tsx` | Add `isNewSession` ref; clear ink on new session; guard ink-load effect |

