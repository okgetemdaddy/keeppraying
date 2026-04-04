

## Fix State Routing: Mutually Exclusive Render Paths

### Root Cause
The reading area (lines 2394-2730) has two conditional branches:
- **Paper Canvas (margin variant)**: gated by `studyMode && studyModeVariant === "margin"` 
- **Standard reader**: gated by `!(studyMode && studyModeVariant === "margin")`

When the user creates a canvas session (`studyModeVariant === "canvas"`), the standard reader **still renders** because it only checks for the margin variant. The `ManuscriptCanvas` at line 2933 renders as a sibling overlay, not as a replacement — so the old reader stays visible underneath.

### Solution
Introduce a unified `activeSession` state and implement strict mutually exclusive rendering with a single ternary.

### Changes

**File: `src/components/bible/BibleReader.tsx`**

1. **Add `activeSession` state** (replaces the `canvasOpen` boolean for the canvas variant):
```ts
const [activeSession, setActiveSession] = useState<CanvasSessionConfig | null>(null);
```

2. **Derive a view mode enum** for clean conditional rendering:
```ts
const viewMode: "reading" | "margin" | "canvas" | "journal" = 
  activeSession ? "canvas" :
  studyMode && studyModeVariant === "margin" ? "margin" :
  studyMode && studyModeVariant === "journal" ? "journal" :
  "reading";
```

3. **Update `onStartSession` callback** (CanvasCreationDrawer, ~line 3052):
   - Set `setActiveSession(config)` instead of just `setCanvasOpen(true)`
   - Still set `studyMode = true` for toolbar gating

4. **Update `handleResumeSession`** (~line 856):
   - Set `setActiveSession(session.config)` instead of `setCanvasOpen(true)`

5. **Update `handleToggleStudyMode(false)`** (~line 837):
   - Add `setActiveSession(null)` to clear the session on exit

6. **Restructure the Reading Area** (lines 2393-2730) into a strict ternary:
```tsx
<div ref={readingAreaRef} className={...}>
  {viewMode === "canvas" ? (
    /* CANVAS STUDIO — full takeover, standard reader unmounted */
    <div className="w-full h-screen overflow-hidden bg-neutral-900">
      <ManuscriptCanvas
        sessionData={activeSession}
        chapterTitle={...}
        verses={...}
        initialStrokes={canvasInitialStrokes}
        onSave={handleCanvasSave}
        onClose={() => { setActiveSession(null); setStudyMode(false); }}
        textSize={textSize}
      />
    </div>
  ) : viewMode === "margin" ? (
    /* PAPER CANVAS (margin study) — existing PaperCanvas block */
    <div key={`canvas-${bookUsfm}-${chapterIdx}`} ...>
      <PaperCanvas ...>...</PaperCanvas>
    </div>
  ) : (
    /* STANDARD READING MODE (+ journal uses this too) */
    <>
      {/* chapter header */}
      {/* AnimatePresence verse list */}
      {/* chapter nav */}
    </>
  )}
</div>
```

7. **Remove the orphaned ManuscriptCanvas block** at lines 2932-2942 (it's now inside the ternary).

8. **Clean up `canvasOpen` state**: Remove `canvasOpen` entirely — replaced by `activeSession !== null`. Update all references (toolbar toggles, swipe guards, etc.) to use `!!activeSession` instead of `canvasOpen`.

### Files

| File | Action |
|------|--------|
| `src/components/bible/BibleReader.tsx` | Refactor render paths + replace `canvasOpen` with `activeSession` |

