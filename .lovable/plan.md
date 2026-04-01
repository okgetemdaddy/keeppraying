

# Voice Recorder Redesign — Multi-Save Prayer Flow

## Overview
Complete rewrite of the VoiceRecorder component to support a multi-stage, non-dismissable dialog with three saveable prayer outputs: voice prayer card, transcribed text prayer card, and AI-refined prayer card.

## New State Machine

```text
idle → recording → results
                     ├── edit transcript (editable textarea)
                     ├── save as voice prayer (audio + raw text, no edits)
                     ├── save as text prayer (edited transcript)
                     └── view refined prayer (slide-over panel)
                           ├── go back
                           └── save refined to board (then slide back)
```

## Key UX Requirements

1. **Recording dialog** — centered on screen (not bottom-anchored), larger text, soft rounded edges (`rounded-3xl`), different font for live transcript (monospace/sans like `Inter` or system sans-serif vs the app's display font)
2. **No X button / no backdrop dismiss** — the ONLY way to close is an explicit "I'm Done" button
3. **After recording stops** — save audio blob immediately, then show the "results" screen with:
   - The raw transcribed text in an editable `<textarea>`
   - Three action buttons:
     - **"Save as Voice Prayer"** — saves audio + original (unedited) transcript as a voice prayer card, no text editing allowed
     - **"Save as Prayer Card"** — saves the (possibly edited) transcript text as a regular prayer card
     - **"PrayerAssist refined your prayer →"** — triggers AI refinement, slides the results panel out and slides in the refined prayer view
4. **Refined prayer slide** — animated slide transition replacing the results content:
   - Shows refined title, prayer text, verses
   - Two buttons: "← Go Back" and "Save to Board"
   - On save: slides back to the results screen (so user can still save voice or text prayer too)
5. **"I'm Done" button** — always visible at bottom of dialog in all post-recording states; this is the only way to dismiss
6. **Saved indicators** — after saving any type, show a checkmark/disabled state on that button so the user knows it's saved but can still save the others

## Changes

### File: `src/components/VoiceRecorder.tsx` (full rewrite)

| Area | Detail |
|---|---|
| State type | Change to `"idle" \| "recording" \| "results" \| "refining" \| "refined"` |
| New state vars | `editedTranscript` (editable text), `originalTranscript` (frozen raw), `savedVoice` / `savedText` / `savedRefined` (booleans for tracking which saves completed), `viewingRefined` (boolean for slide animation) |
| Recording UI | Fixed centered overlay (`fixed inset-0 flex items-center justify-center`), larger panel (`max-w-lg w-full`), `rounded-3xl`, bigger text (`text-lg` for "Listening…"), monospace/sans font for live transcript (`font-mono` or `font-sans`), soft shadow |
| Stop button | Renamed to just "Stop Recording" — no longer auto-refines. Transitions to `results` state |
| Results UI | Shows textarea with `editedTranscript`, three buttons stacked vertically, "I'm Done" at bottom |
| Save as Voice Prayer | Uploads audio blob + original transcript to `prayer_cards` with `voice-prayer` label and audio URL. Marks `savedVoice = true` |
| Save as Prayer Card | Saves `editedTranscript` as a regular prayer card (no audio). Marks `savedText = true` |
| PrayerAssist button | Calls `refine-voice-prayer` edge function, sets `viewingRefined = true` with slide animation |
| Refined view | `AnimatePresence` slide from right. Shows refined prayer. "Save to Board" saves and sets `savedRefined = true`, then auto-slides back. "Go Back" slides back without saving |
| I'm Done | Only dismiss mechanism. Resets all state to idle. Always visible in results/refined states |
| Remove X button and cancel/discard | No close button, no backdrop click dismiss |

### File: `src/pages/WarRoom.tsx` — no changes needed (already renders `<VoiceRecorder variant="inline" dark />`)

## Technical Notes
- Audio blob is captured during recording and stored in ref — on stop it's finalized and kept for potential voice prayer save
- The dialog uses `fixed inset-0` with a semi-transparent backdrop to prevent interaction with the page behind it
- Each save operation is independent — user can save 0, 1, 2, or all 3 types
- Offline queue logic preserved for the refine call

