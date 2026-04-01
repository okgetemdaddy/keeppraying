

# Fix: Voice ID in TTS Cache Key

## Problem
Cache key is just the card ID. Changing voice preference still plays the old cached audio because the lookup hits the existing cache before ever reaching the edge function with the new voice.

## Fix

### `src/components/board/BoardCard.tsx`
- Change the `cacheId` passed to `useTtsPlayer` from `card.id` to `` `${card.id}_${ttsVoiceId || 'sal'}` ``
- This ensures each voice variant gets its own cache entry in both IndexedDB and remote storage

### `src/pages/Board.tsx` (or wherever `toggleTts` is called with a cacheId)
- Same pattern: include voice ID in any explicit `cacheId` passed to `toggleTts(text, cacheId)`

No database or edge function changes needed — the storage paths automatically use the new compound key.

