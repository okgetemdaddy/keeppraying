

## Fix: Add Speaker Button to Board Prayer Cards

The speaker/listen button was planned but never implemented in `BoardCard.tsx`. Here's what needs to happen:

### Changes — single file: `src/components/board/BoardCard.tsx`

**1. Add imports**
- `Volume2` from `lucide-react`
- `useTtsPlayer` from `@/hooks/useTtsPlayer`
- `TtsContemplationOverlay` from `@/components/TtsContemplationOverlay`

**2. Initialize TTS in the `BoardCard` component**
- Call `useTtsPlayer({ cacheId: card.id, audioUrl: card.audio_url })` to get `ttsLoading`, `ttsPlaying`, `toggleTts`, `stopTts`, `pauseTts`, `resumeTts`, `timedPhrases`, `audioRef`, `playbackRate`, `changePlaybackRate`
- Add `ttsOverlayOpen` state to control the overlay

**3. Add `onListen` prop to `ActionButtons