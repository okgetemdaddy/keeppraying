

## Fix: Pencil Detection Flow + "iPad Mode Session" Label

### Problem
Two issues:

1. **The Pencil Detected onboarding sheet was never built.** The pencil detection `useEffect` (line 1106–1121) still has the old behavior: it directly calls `handleStudyModeEntry()` and shows a toast. This immediately triggers the Resume/New session flow, skipping the onboarding sheet entirely.

2. **The ResumeOrNewSheet says "Your Last Session"** (line 134) — should say **"iPad Mode Session"**.

### Changes

#### 1. Create `src/components/bible/PencilDetectedSheet.tsx`

The onboarding sheet from the earlier approved plan. Framer Motion bottom sheet with:
- Drag handle, minimal SVG pencil-tip illustration
- "Apple Pencil Detected" headline (EB Garamond, amber/gold)
- Body text about iPad Study Mode features
- 3 feature rows with ✦ markers (Focused Passages, Pressure-Sensitive Ink, Premium Art Tools with "Soon" badge)
- Primary CTA: amber gradient "Try iPad Study Mode" → sets localStorage `kr_pencil_onboard_shown`, calls `onTryStudyMode`
- Secondary CTA: "Maybe Later" → sets localStorage, calls `onDismiss`
- Fine print: "Access Study Mode anytime from the pen icon in the toolbar"

#### 2. Update pencil detection `useEffect` in `BibleReader.tsx` (line 1105–1121)

Replace the current block that calls `handleStudyModeEntry()` + toast with:

```ts
if (e.pointerType === "pen" && !pencilDetected) {
  setPencilDetected(true);
  if (!studyMode && !localStorage.getItem("kr_pencil_onboard_shown")) {
    setPencilOnboardOpen(true);
  }
}
```

- No `handleStudyModeEntry()` call
- No toast
- Only opens the onboarding sheet

Add state: `pencilOnboardOpen` (boolean).

Add two handlers:
- `handlePencilOnboardDismiss`: close sheet, set localStorage — does NOT enter study mode
- `handlePencilTryStudyMode`: close sheet, set localStorage, THEN call `handleStudyModeEntry()`

Render `<PencilDetectedSheet>` in the JSX near the other sheets.

#### 3. Update `ResumeOrNewSheet.tsx` label (line 134)

Change `"Your Last Session"` → `"iPad Mode Session"`

### Files

| File | Change |
|------|--------|
| `src/components/bible/PencilDetectedSheet.tsx` | New — onboarding sheet |
| `src/components/bible/BibleReader.tsx` | Fix pencil detection useEffect, add state + handlers, render PencilDetectedSheet |
| `src/components/bible/ResumeOrNewSheet.tsx` | Label change: "iPad Mode Session" |

