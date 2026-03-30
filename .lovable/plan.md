

## Plan: Align side buttons with "Add a Breath"

### What's happening now
The side buttons container (`God's Word`, `Add a Prayer`, `Report Issue`) is positioned with `bottom: calc(var(--fab-bottom, 5rem) + 16.5rem)`, which places them too high.

### Change
In `src/components/PrayerFAB.tsx` line 199, reduce the bottom offset from `16.5rem` to approximately `10.5rem` so the bottom edge of the side button group aligns with the bottom of the "Add a Breath" FAB item (4th item from the FAB button).

**Single line change:**
```
bottom: "calc(var(--fab-bottom, 5rem) + 16.5rem)"
→
bottom: "calc(var(--fab-bottom, 5rem) + 10.5rem)"
```

