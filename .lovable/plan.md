

# Fix: Immediate Red Error on Mic Button in War Room

## Problem
Clicking the mic button fires `SpeechRecognition.start()`, which immediately errors with `audio-capture` in environments where mic access is blocked (e.g. the Lovable preview iframe, or if the user denied permission). This error is not in the harmless list, so a scary red toast with just "audio-capture" appears.

## Fix

**File:** `src/components/VoiceRecorder.tsx`

### 1. Handle `audio-capture` and `not-allowed` gracefully
Instead of showing the raw error string, detect these two mic-permission errors and show a user-friendly message:

```ts
recognition.onerror = (event: any) => {
  console.error("Speech recognition error:", event.error);
  const harmless = ["no-speech", "aborted", "network"];
  if (harmless.includes(event.error)) return;

  const micBlocked = ["audio-capture", "not-allowed"];
  if (micBlocked.includes(event.error)) {
    toast({
      title: "Microphone not available",
      description: "Please allow microphone access in your browser settings and try again.",
    });
    cancel(); // clean reset instead of stopRecording
    return;
  }

  toast({ title: "Recording error", description: event.error, variant: "destructive" });
  stopRecording();
};
```

### 2. Guard `getUserMedia` failure
The `navigator.mediaDevices.getUserMedia` call already has a `.catch(() => {})` that silently swallows mic denial. This is fine since it's only for the audio recording (not transcription). No change needed there.

### Result
- `audio-capture` / `not-allowed` → friendly toast + clean reset to idle, no red error
- `no-speech` / `aborted` / `network` → silently ignored (existing behavior)
- Other errors → red toast (existing behavior)

### Files Modified
| File | Change |
|------|--------|
| `src/components/VoiceRecorder.tsx` | Add friendly handling for `audio-capture` and `not-allowed` errors |

