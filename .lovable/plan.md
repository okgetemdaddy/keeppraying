

## Gate iPad Study Mode to iPad-Only

### Problem
The Study Mode button and entry flow are currently visible and accessible on all devices (phone, desktop, iPad). They should only be available on actual iPads.

### Changes — `src/components/bible/BibleReader.tsx`

**1. Guard `handleStudyModeEntry` (line ~989)**
Add `isIPad` check as the very first gate, before auth:
```ts
if (!isIPad) return;
```

**2. Hide Study Mode button in sticky toolbar (line ~2382–2400)**
Wrap the Study Mode `<Button>` with `{isIPad && ( ... )}` so it doesn't render on non-iPad devices.

**3. Hide Study Mode button in slide-down nav (line ~2654–2670)**
Same `{isIPad && ( ... )}` conditional wrap around the second Study Mode toggle button.

**4. Guard pencil detection useEffect (line ~1100–1118)**
The existing `isIPad` check is already there but only gates the pencil detection — confirm no fallthrough. The `handleStudyModeEntry` call inside is already protected by the new guard in step 1.

No other files need changes — `handleStudyModeEntry` is the single entry point and the two buttons are the only UI triggers.

