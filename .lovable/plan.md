

# Move Mic Button Below "Browse Classical Prayers" in War Room

## Problem
The VoiceRecorder mic button is in the SiteNav header's `rightSlot`, making the inline error popup hard to position and invisible. The user wants it moved below the "Browse Classical Prayers" button in the main content area.

## Changes

**File:** `src/pages/WarRoom.tsx`

### 1. Remove VoiceRecorder from SiteNav rightSlot (line 390)
Delete `<VoiceRecorder variant="compact" dark />` from the header's rightSlot.

### 2. Add VoiceRecorder below the Classical Prayers button (after line 521)
Insert the VoiceRecorder component right after the "Browse Classical Prayers" button, using the `inline` variant instead of `compact` so it renders appropriately in the content area. Style it to match the War Room theme.

```tsx
{/* After the Classical Prayers button */}
<VoiceRecorder variant="inline" dark onPrayerCreated={() => {}} />
```

### Result
The mic button and its error popup will live in the main content flow, below "Browse Classical Prayers", where there's plenty of room for the popup to render visibly.

