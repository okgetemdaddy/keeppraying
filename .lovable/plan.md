

# Fix CC Toggle Deselecting on Outside Click

## Problem
The CC (caption) toggle on prayer cards uses local `useState` inside `BoardCard`. When the user clicks elsewhere on the Board, the card list re-renders (e.g., from a data refetch or parent state change), causing `BoardCard` to remount and reset `localCaptionTts` / `localCaptionRecorded` back to the prop default values.

## Solution
Lift the CC toggle state out of `BoardCard` and into the Board page level, using the existing `useBoardPreferences` hook which already has `caption_mode_tts` and `caption_mode_recorded` fields that persist to the database.

## Changes

### File: `src/pages/Board.tsx`
- Pass `onToggleCaptionTts` and `onToggleCaptionRecorded` callbacks to `BoardCard` that call `updatePref("caption_mode_tts", !prefs.caption_mode_tts)` and similar
- These persist the toggle to the database so it survives page refreshes too

### File: `src/components/board/BoardCard.tsx`
- Remove `localCaptionTts` and `localCaptionRecorded` local state
- Add new props: `onToggleCaptionTts?: () => void` and `onToggleCaptionRecorded?: () => void`
- Use the existing `captionModeTts` and `captionModeRecorded` props directly (they're already passed from Board) instead of copying them into local state
- Pass the new toggle callbacks down to `ActionButtons` and `VoiceWaveformPlayer`

This makes the CC toggle a persistent, global preference rather than ephemeral local state that resets on re-render.

