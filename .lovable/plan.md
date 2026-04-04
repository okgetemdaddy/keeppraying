

## Two Fixes in BibleReader.tsx

### FIX 1: `.single()` → `.maybeSingle()`

**File:** `src/components/bible/BibleReader.tsx` (line 926)

Change `.single()` to `.maybeSingle()` in the resume-check query inside `handleStudyModeEntry`. The existing `if (session)` null check already handles the no-session case — this just prevents Supabase from throwing PGRST116 when zero rows match.

### FIX 2: Pass camera ref to heartbeat

**Problem:** `PaperCanvas` owns `transformState` internally (line 99 of PaperCanvas.tsx) and exposes it via `PaperCanvasContext`. But `useStudySessionHeartbeat` is called at the `BibleReader` level — **outside** the context provider's subtree. So we can't just call `usePaperCamera()`.

**Solution:** Add an optional `cameraRef` prop to `PaperCanvas` so BibleReader can pass in a ref it owns:

1. **BibleReader.tsx**: Create a `useRef` for the camera state:
   ```ts
   const paperCameraRef = useRef({ x: 0, y: 0, scale: 1, rotation: 0 });
   ```
   Pass it to both `PaperCanvas` and `useStudySessionHeartbeat`:
   ```ts
   useStudySessionHeartbeat({
     sessionId: activeSessionId,
     timerMinutes: activeSessionConfig?.timerMinutes,
     cameraRef: paperCameraRef,
   });
   ```
   ```tsx
   <PaperCanvas cameraRef={paperCameraRef} ... />
   ```

2. **PaperCanvas.tsx**: Accept optional `cameraRef` prop. When provided, sync it with the internal `transformState` — after every `applyTransform()` call, copy the current values to `cameraRef.current`. Also use it as the value in the context provider so resume-session restore works through the same ref.

### Files

| File | Change |
|------|--------|
| `src/components/bible/BibleReader.tsx` | `.maybeSingle()` fix + create `paperCameraRef` + wire to heartbeat and PaperCanvas |
| `src/components/bible/PaperCanvas.tsx` | Accept `cameraRef` prop, sync with internal transform state |

