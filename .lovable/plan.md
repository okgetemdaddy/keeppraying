

# Fix: toggleTts cache key override in handleListen

## Problem
`useTtsPlayer` is correctly initialized with `cacheId: \`${card.id}_${ttsVoiceId || 'sal'}\``, but `handleListen` calls `toggleTts(text, card.id)` — the second argument overrides the options-level cacheId with just the bare card ID, so the voice-specific cache key is never used during playback.

## Fix

**File: `src/components/board/BoardCard.tsx` (line 189)**

Change:
```ts
toggleTts(text, card.id);
```
To:
```ts
toggleTts(text);
```

By omitting the second argument, `toggleTts` will fall back to `options.cacheId` which already contains the correct compound key (`cardId_voiceId`). No other files need changes.

