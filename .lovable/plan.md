

## Canvas Creation Drawer — Full-Screen Split-Screen Modal

### Overview
Replace the current `CanvasSetupSheet` (bottom sheet) with a premium full-screen split-screen drawer for creating isolated verse study canvases. Left pane = dark control panel, right pane = live WYSIWYG canvas preview with a draggable/resizable text bounding box.

### Architecture

```text
┌──────────────────────────────────────────────────────────┐
│  CanvasCreationDrawer (fixed inset-0, z-[100])           │
│ ┌────────────────┬───────────────────────────────────────┐│
│ │ Left Pane 35%  │  Right Pane 65%                      ││
│ │ bg-zinc-950     │  bg-zinc-900 (dark backdrop)         ││
│ │                │                                       ││
│ │ Verse Selector │  Scaled white canvas div              ││
│ │ Paper Size     │  ┌─────────────────────┐              ││
│ │ Chars/Line     │  │ Draggable/Resizable │              ││
│ │ Line Spacing   │  │ Text Bounding Box   │              ││
│ │                │  │ (dashed blue border) │              ││
│ │ [Start Session]│  └─────────────────────┘              ││
│ └────────────────┴───────────────────────────────────────┘│
└──────────────────────────────────────────────────────────┘
```

### New File: `src/components/bible/CanvasCreationDrawer.tsx`

**Props:**
- `open`, `onOpenChange` — visibility control
- `bibleId` — current version ID for verse fetching
- `books` — book index for selectors
- `onStartSession(config)` — emits the JSON configuration

**Left Pane Controls:**
1. **Verse Selector** — Book dropdown + chapter dropdown + "from verse" / "to verse" number inputs. Fetches verse text via existing `useBibleChapterVerses` hook.
2. **Paper Size** — Dropdown presets (Letter 8.5×11, A4, Square 8×8, Tabloid 11×17) + "Custom" option that reveals width/height sliders (4–17 inches).
3. **Characters Per Line** — Slider (20–80), controls the text block width relative to canvas.
4. **Line Spacing** — Slider (1.0×–3.0×, step 0.1), controls interlinear space.

**Right Pane Preview:**
- Dark neutral backdrop (`bg-zinc-900`).
- White div sized to the exact aspect ratio of the selected paper dimensions, CSS-scaled via `transform: scale(fitScale)` to fit the pane.
- **Text Bounding Box**: Instead of `react-rnd` (not installed), implement a lightweight custom draggable/resizable div using pointer events. The box has `border-2 border-dashed border-blue-500` when active, with 8 resize handles (corners + sides) as small solid blue squares. Dragging moves the box; dragging handles resizes it. Text reflows to fit the new width.
- Verses render inside the box with the selected typography settings (font size derived from chars-per-line, line spacing applied).

**Data Output:**
"Start Session" button emits:
```ts
interface CanvasSessionConfig {
  verses: { number: number; text: string }[];
  verseRange: string; // e.g. "Romans 8:1-4"
  paper: { widthIn: number; heightIn: number };
  textBox: { x: number; y: number; width: number; height: number }; // in inches
  typography: { charsPerLine: number; lineSpacing: number };
}
```

### Mobile Handling
On mobile (`useIsMobile()`), stack the panes vertically — controls on top (collapsible accordion sections), preview below. The preview auto-scrolls into view when settings change.

### Integration: `src/components/bible/BibleReader.tsx`
- Add new state `canvasCreationOpen` and render `CanvasCreationDrawer` alongside the existing `CanvasSetupSheet`.
- The existing `CanvasSetupSheet` remains for the "margin" study mode variant. The new drawer is for the "extract verses" flow (triggered from a new entry point — e.g. a toolbar button or context menu action on selected verses).
- `onStartSession` handler receives the config JSON object, stores it in state, and initializes `PaperCanvas` with the custom dimensions and text layout.

### Files

| File | Action |
|------|--------|
| `src/components/bible/CanvasCreationDrawer.tsx` | **Create** — full-screen split-screen modal with all controls and WYSIWYG preview |
| `src/components/bible/BibleReader.tsx` | **Edit** — add state + render the new drawer, wire up entry point |

### Technical Notes
- Custom drag/resize implementation avoids adding `react-rnd` dependency. Uses `onPointerDown` → `onPointerMove` → `onPointerUp` pattern with `setPointerCapture` for reliable tracking.
- Canvas coordinates stored in inches (paper-relative), converted to pixels at 96 DPI for preview rendering.
- The existing `useBibleChapterVerses` hook handles verse fetching. The drawer composes book/chapter/verse selectors from the `books` index prop.

