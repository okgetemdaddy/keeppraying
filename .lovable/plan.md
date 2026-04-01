

# Fix: Microphone "aborted" Error in Voice Recorder

## Problem
The `SpeechRecognition` API fires an `"aborted"` error when the session is interrupted — this is normal and expected (e.g. when the user stops recording, or recognition auto-restarts). But the current error handler only ignores `"no-speech"`, so `"aborted"` triggers a scary red toast and calls `stopRecording()`.

A second bug: the `recognition.onend` handler references `state` from the closure, which is always `"idle"` (the value when `startRecording` was called). So auto-restart never works — recognition just dies silently, and if it fires `"aborted"` on the way out, the user sees an error.

## Fix

**File:** `src/components/VoiceRecorder.tsx`

### 1. Use a ref for recording state so closures always see current value
Add a `stateRef` that stays in sync with `state`, and use it in the `onend` handler.

### 2. Ignore harmless SpeechRecognition errors
Change the error filter from:
```ts
if (event.error !== "no-speech") {
```
to:
```ts
const harmless = ["no-speech", "aborted", "network"];
if (!harmless.includes(event.error)) {
```
This prevents `"aborted"` (normal lifecycle) and `"network"` (brief connectivity blips) from showing a destructive toast and killing the session.

### 3. Don't call stopRecording on harmless errors
Only call `stopRecording()` for real failures (like `"not-allowed"` or `"audio-capture"`).

### Files Modified
| File | Change |
|------|--------|
| `src/components/VoiceRecorder.tsx` | Add `stateRef`, fix error filter, fix `onend` closure |

