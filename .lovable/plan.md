

## Always Start /bible in Reading Mode — Add Session Picker Flow

### Problem
Currently, `/bible` on iPad restores `studyMode` from localStorage, so users can land directly in study mode. The request is to always start in reading mode and require an explicit action to enter study mode — either manually selecting it or having Apple Pencil auto-detect trigger it.

Additionally, when study mode is activated, instead of jumping straight into a canvas, present a **Session Picker** that lets the user resume an existing session or create a new one (entering the Canvas Creation Drawer).

### Changes

**1. `src/components/bible/BibleReader.tsx` — Force reading mode on mount**

- Change `studyMode` initial state from reading localStorage to always `false`
- Keep localStorage persistence for the *variant* preference, but not the active state
- When Apple Pencil is detected, instead of auto-enabling study mode, show the Session Picker
- When the user toggles study mode on (via Sleeve or toolbar), show the Session Picker instead of going directly to setup/creation

**2. New component: `src/components/bible/SessionPickerSheet.tsx`**

A bottom sheet / dialog that appears when the user activates study mode. Contains:

- **"Resume Session"** section — lists saved canvas sessions from localStorage (keyed by book+chapter+timestamp). Each card shows the verse range, paper size, and a timestamp. Tap to resume.
- **"New Session"** button — opens the Canvas Creation Drawer
- If no saved sessions exist, skip the list and show a hero prompt: "Start your first canvas session" with a single CTA that opens the Canvas Creation Drawer

Data structure for saved sessions (localStorage key: `bible_canvas_sessions`):
```ts
interface SavedSession {
  id: string;
  createdAt: string;
  verseRange: string;
  bookUsfm: string;
  chapterIdx: number;
  config: CanvasSessionConfig;
}
```

**3. Flow changes**

```text
User taps Study Mode toggle (or Pencil detected)
  → SessionPickerSheet opens
    → "New Session" → CanvasCreationDrawer opens → onStartSession → study mode activates
    → "Resume [session]" → study mode activates with saved config
    → Dismiss → nothing happens, stays in reading mode
```

**4. Apple Pencil detection update**

When pencil is detected and study mode is off:
- Set `pencilDetected = true`  
- Show toast: "🍎 Apple Pencil detected"  
- Open the SessionPickerSheet (not auto-enable study mode)

### Files

| File | Action |
|------|--------|
| `src/components/bible/SessionPickerSheet.tsx` | **Create** — session list + new session CTA |
| `src/components/bible/BibleReader.tsx` | **Edit** — force `studyMode=false` on mount, wire SessionPickerSheet into toggle + pencil detection flow |

