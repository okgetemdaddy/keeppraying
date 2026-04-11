

## Update 3D Prayer Card: Three Rotating Prayer/Testimony Pairs

### What Changes

**File: `src/components/LaunchOverlay.tsx`** — `PrayerCard3D` component

**1. Define three prayer/testimony pairs as data:**

| # | Prayer | Testimony |
|---|--------|-----------|
| 1 | **Existing (updated):** A mother's healing from cancer — petition for God's healing hand, trust during treatment | God answered — doctors found no trace of cancer after 6 months |
| 2 | **New:** A concerned mother praying for her daughter who has wandered from faith, developed bad habits, strained relationship — asking the God of restoration to draw her back | Long talks restored, laughter returned, relationship healed — God brought her daughter home |
| 3 | **New:** A third prayer/testimony pair — e.g., a father praying for provision after job loss → miraculous job offer and debts paid |

**2. Rotation logic:**

- Add a `pairIndex` state (0, 1, 2) alongside the existing `flipped` state
- On each flip cycle: show prayer (front) → flip to testimony (back) → pause → flip back to front while advancing `pairIndex` to next pair
- Sequence: Prayer₁ → Testimony₁ → Prayer₂ → Testimony₂ → Prayer₃ → Testimony₃ → repeat
- The content transitions with a subtle fade when the pair changes (while card is face-down/mid-flip)
- Manual tap still flips but also follows the rotation sequence

**3. Content rendered dynamically** from the pairs array instead of hardcoded JSX — the card face markup stays the same, just reads from `pairs[pairIndex]`.

### Technical Detail

```
// Flip timing: every 5s flip card. After showing back for 5s, 
// flip to front AND increment pairIndex (mod 3).
// Content updates happen while backface is showing, so transition is seamless.
```

State machine: `flipped=false` (showing prayer) → 5s → `flipped=true` (showing testimony) → 5s → `flipped=false + pairIndex = (pairIndex+1) % 3` (next prayer)

### Files Changed

| File | Change |
|------|--------|
| `src/components/LaunchOverlay.tsx` | Add pairs array, rotation state, update PrayerCard3D to cycle through 3 pairs |

