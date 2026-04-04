

## Fix Two Bugs: Auth Check for Gestures + Native Scrolling in Study Mode

### 1. Restore sign-in prompt for unauthenticated gesture actions — `BibleReader.tsx`

**onUnderlineGesture** (line 2255): Add auth check at the top of the callback, before the highlight mutation:
```ts
if (!user) {
  toast("Please sign in to highlight verses", {
    description: "Create a free account to save highlights and annotations"
  });
  return;
}
```

**handleXGesture** (line 1229): Add the same auth check at the top of the callback body (it calls `mutations.removeHighlight.mutate` which is a Supabase write).

**onCircleSelect** and **onWordCircle**: These are client-side state operations (setting selected verses, opening Reference Bloom) — no auth check needed.

### 2. Fix two-finger scroll in study mode

Three files, four small edits:

**BibleReader.tsx** (lines 934-947): Replace the current study mode useEffect with a simpler version that only sets `overscrollBehavior`. Remove the `touchAction` override — ZoomWrapper handles that:
```ts
useEffect(() => {
  if (!studyMode || studyModeVariant !== "margin") return;
  const area = readingAreaRef.current;
  if (!area) return;
  area.style.overscrollBehavior = "none";
  return () => { area.style.overscrollBehavior = ""; };
}, [studyMode, studyModeVariant]);
```

**ZoomWrapper.tsx** line 95: Change `touchAction: studyMode ? "none" : "pan-y"` → `touchAction: "pan-y"`.

**ZoomWrapper.tsx** line 128: Remove `touchAction: "none"` from the overlay wrapper div style. Keep `userSelect: "none"` and `WebkitUserSelect: "none"`.

### Files
| File | Changes |
|------|---------|
| `src/components/bible/BibleReader.tsx` | Add auth checks to gesture callbacks; simplify study mode useEffect |
| `src/components/bible/ZoomWrapper.tsx` | Two style prop edits |

