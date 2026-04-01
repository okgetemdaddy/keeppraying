

# Fix Voice Recorder Overlay + Center the Chooser

## Problems Identified

1. **Double overlay**: Board.tsx wraps `VoiceRecorder` inside a `<Dialog>` ("Speak Your Prayer" header), but VoiceRecorder also creates its own `fixed inset-0` overlay when recording. Result: the "Speak Your Prayer" dialog is visible behind/underneath the recording UI, causing the cut-off mess in the screenshot.

2. **PrayerMethodChooser** uses `ResponsiveDialog` which renders as a bottom drawer on mobile instead of a centered dialog.

3. When recording starts, the parent "Speak Your Prayer" dialog title/description remain visible, cluttering the screen.

## Fix

### 1. Board.tsx — Remove the Dialog wrapper around VoiceRecorder

Instead of wrapping VoiceRecorder in a Dialog, render it conditionally with no wrapper. VoiceRecorder already renders its own full-screen centered overlay when `state !== "idle"`. When `voiceRecorderOpen` is true, auto-start recording immediately (skip the idle mic button).

**Changes (lines 870–896):**
- Remove the `<Dialog>` / `<DialogContent>` / `<DialogHeader>` wrapper
- Render `{voiceRecorderOpen && <VoiceRecorder variant="inline" autoStart onPrayerCreated={...} onClose={() => setVoiceRecorderOpen(false)} />}` directly

### 2. VoiceRecorder.tsx — Add `autoStart` and `onClose` props

- New prop `autoStart?: boolean` — when true, call `startRecording()` on mount instead of showing the idle mic button
- New prop `onClose?: () => void` — called when the user clicks "I'm Done" so the parent can set `voiceRecorderOpen = false`
- When `variant="inline"` and `autoStart`, skip the idle state entirely — go straight to recording

### 3. PrayerMethodChooser.tsx — Use standard Dialog instead of ResponsiveDialog

Replace `ResponsiveDialog` (which becomes a drawer on mobile) with a regular `Dialog` from `@/components/ui/dialog` so it renders **centered** on all screen sizes. Add `items-center justify-center` positioning.

## Files Changed

| File | Change |
|------|--------|
| `src/pages/Board.tsx` | Remove Dialog wrapper around VoiceRecorder; render conditionally with `autoStart` and `onClose` props |
| `src/components/VoiceRecorder.tsx` | Add `autoStart` and `onClose` props; auto-start recording on mount when `autoStart` is true; call `onClose` from "I'm Done" button |
| `src/components/board/PrayerMethodChooser.tsx` | Switch from `ResponsiveDialog` to standard centered `Dialog` |

