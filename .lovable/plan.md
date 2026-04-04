

## Fix: PaperCanvas Text Column Width from Session Config

### Problem
`PaperCanvas.tsx` hardcodes `maxWidth: 936px` with fixed padding on the text column. The `CanvasCreationDrawer` calculates precise text box position and dimensions from `charsPerLine`, but these values are ignored at render time — line breaks won't match the preview.

### Changes

**1. `src/components/bible/PaperCanvas.tsx`**

- Add optional `textBoxConfig` to `PaperCanvasProps`:
  ```ts
  textBoxConfig?: { x: number; y: number; width: number; height: number };
  ```
- In the text column div (lines 308–324), branch on `textBoxConfig`:
  - **When provided**: use `position: absolute`, `left/top/width/maxHeight` from the config, no margin/padding overrides
  - **When absent**: keep existing hardcoded layout (backward compat)

**2. `src/components/bible/BibleReader.tsx`**

- Where `<PaperCanvas>` is rendered (~line 2606), pass `textBoxConfig` when `activeSessionConfig?.textBox` exists:
  ```tsx
  textBoxConfig={activeSessionConfig?.textBox ? {
    x: activeSessionConfig.textBox.x * 96,
    y: activeSessionConfig.textBox.y * 96,
    width: activeSessionConfig.textBox.width * 96,
    height: activeSessionConfig.textBox.height * 96,
  } : undefined}
  ```

  The `* 96` converts from inches (stored in config) to pixels (96 DPI canvas).

### Files
| File | Change |
|------|--------|
| `src/components/bible/PaperCanvas.tsx` | Add `textBoxConfig` prop, conditionally render absolute-positioned text column |
| `src/components/bible/BibleReader.tsx` | Pass `textBoxConfig` from `activeSessionConfig.textBox` to `PaperCanvas` |

