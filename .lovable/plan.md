

## Phase 1: PaperCanvas + Canvas Setup Sheet

### New Files

**1. `src/components/bible/PaperCanvas.tsx`**

A fixed desk surface with an 11×17 inch paper page. Architecture follows the existing `/canvas` ZoomPanWrapper pattern closely.

- **Desk layer**: `position: fixed; inset: 0` with darker background (`#e8e4df` light / `#0f0e0d` dark`). Dark mode detected via `document.documentElement.classList.contains('dark') || document.documentElement.classList.contains('bible-dark')`.
- **Paper layer**: `animated.div` at 1056×1632px (11×17in × 96dpi), white parchment background (`#faf8f5` light / `#1a1916` dark`), subtle box-shadow, transforms via `@react-spring/web` springs for `x`, `y`, `rotation`.
- **Text column**: `maxWidth: 55ch`, centered via `margin: 0 auto`, padding 80px top / 60px sides / 100px bottom. `fontSize: baseFontSize * zoom` px, `lineHeight: fontSize * textSpacing`.
- **Overlay slot**: Absolute-positioned div covering full paper for InkOverlay, same pattern as existing ZoomWrapper overlay.
- **Children**: Passed through inside the text column div.

**Touch gesture handling** (raw touch events via `useEffect` on desk container, copied from ZoomPanWrapper.tsx):

| Gesture | Behavior |
|---------|----------|
| 3-finger | Pan (midpoint delta → x,y springs) + Rotate (angle between finger 1 & 3, delta → rotation spring) |
| 2-finger pinch | Semantic zoom: distance delta × 0.15 → fontSize change, clamped 14-72px, calls `onZoomChange(clampedFontSize / baseFontSize)` |

Physics constants reused from ZoomPanWrapper: `SPRING_CONFIG {tension:170, friction:26}`, `SNAPBACK_CONFIG {tension:120, friction:20}`, velocity buffer, 400px/s cap (90°/s for rotation), 8px dead zone, 180ms grace period, 60% boundary rubber-banding.

**Desktop fallback**: `@use-gesture/react` `useGesture` onWheel — plain scroll → vertical pan spring, ctrl/cmd+scroll → semantic zoom. Same as existing ZoomPanWrapper.

**Snap-to-center button**: Fixed bottom-right (bottom: 140px), dark pill, resets x/y/rotation springs to 0 with SNAPBACK_CONFIG.

**2. `src/components/bible/CanvasSetupSheet.tsx`**

Bottom sheet using `ResponsiveSheet` pattern from the codebase.

Props: `open`, `onOpenChange`, `bookTitle` (e.g. "Genesis"), `chapterTitle` (e.g. "1"), `versionAbbr` (e.g. "NIV"), `previewVerses` (first 3 verses), `onConfirm(spacing: number)`.

Content:
- Title: "Create Your Canvas" with subtitle "{bookTitle} {chapterTitle} · {versionAbbr}"
- 4 radio options for line spacing: Compact (1.8×), Comfortable (2.4×), Generous (2.8× — default selected), Wide Open (3.5×)
- Live preview: 3 verse lines rendered at selected spacing with EB Garamond font
- Paper size display: "11 × 17 in" (read-only for Phase 1)
- "Create Canvas" primary button → calls `onConfirm(selectedSpacing)`
- "Cancel" secondary button → closes sheet

### Modified Files

**3. `src/components/bible/iPadStudyToolbar.tsx`**

- Add optional prop `hideSpacing?: boolean` to `IPadStudyToolbarProps`
- In the secondary row (line 331-344), wrap the Spacing section in a conditional: `{!hideSpacing && ( ... )}`
- Also hide the divider before spacing when `hideSpacing` is true

**4. `src/components/bible/BibleReader.tsx`**

State additions:
- `const [canvasSetupOpen, setCanvasSetupOpen] = useState(false);`

Modify `handleToggleStudyMode` (line 824):
- When turning ON (`v === true`) and `studyModeVariant === "margin"`, set `canvasSetupOpen = true` instead of immediately setting `studyMode = true`
- All other cases unchanged

Modify Apple Pencil auto-detect (line 847):
- When pencil detected and variant is "margin", open setup sheet instead of directly enabling study mode

Add `CanvasSetupSheet` render (near other sheets/modals):
```tsx
<CanvasSetupSheet
  open={canvasSetupOpen}
  onOpenChange={setCanvasSetupOpen}
  bookTitle={currentBook?.title ?? ""}
  chapterTitle={currentChapter?.id ?? ""}
  versionAbbr={versions?.find(v => v.id === versionId)?.localized_abbreviation ?? ""}
  previewVerses={verses.slice(0, 3)}
  onConfirm={(spacing) => {
    setInkTextSpacing(spacing);
    localStorage.setItem("bible_ink_spacing", String(spacing));
    setStudyMode(true);
    localStorage.setItem("bible_study_mode", "true");
    setCanvasSetupOpen(false);
  }}
/>
```

Replace study mode rendering branch (line 2171-2336):
- When `studyMode && studyModeVariant === "margin"`, render `<PaperCanvas>` instead of `<ZoomWrapper>`
- Pass same props: `zoom={inkZoom}`, `onZoomChange={handleInkZoomChange}`, `baseFontSize={textSize}`, `textSpacing={inkTextSpacing}`, `textAlign={wsTextAlign}`, `marginWidth={wsMarginWidth}`, `canvasBackground={wsCanvasBackground}`
- Move the InkOverlay from ZoomWrapper's `overlay` prop to PaperCanvas's `overlay` prop — all callbacks (onCircleSelect, onWordCircle, onUnderlineGesture, onXGesture, etc.) stay identical
- Children (the verse `<section>`) stay identical

Pass `hideSpacing={true}` to `IPadStudyToolbar` when `studyMode && studyModeVariant === "margin"`.

### Files Summary

| File | Action |
|------|--------|
| `src/components/bible/PaperCanvas.tsx` | Create — desk + paper + gestures |
| `src/components/bible/CanvasSetupSheet.tsx` | Create — spacing selection sheet |
| `src/components/bible/iPadStudyToolbar.tsx` | Edit — add `hideSpacing` prop |
| `src/components/bible/BibleReader.tsx` | Edit — setup sheet flow, swap ZoomWrapper→PaperCanvas in study mode |

