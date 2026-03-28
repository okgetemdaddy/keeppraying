

## Fix: Remove Truncation from KeepPray.ing Sayings

### Problem
The saying text has `max-w-[200px] sm:max-w-[280px] truncate` which cuts off words with "…".

### Solution
Remove the `max-w` constraints and `truncate` class. Instead, allow the saying to wrap naturally and use a smaller font size that fits comfortably. The logo area link should expand to accommodate the full text.

### Changes

**`src/components/SiteNav.tsx`** (lines 236 + 245-246)

1. **Logo link container** (line 236): Change from `flex-shrink-0 min-w-[120px] sm:min-w-[160px]` to `flex-shrink-0 min-w-0 max-w-[55%] sm:max-w-[340px]` — allows the saying to use available space without pushing nav items off-screen.

2. **Saying span** (line 246): Replace `"block font-display text-sm sm:text-base italic tracking-wide max-w-[200px] sm:max-w-[280px] truncate"` with `"block font-display text-xs sm:text-sm italic tracking-wide leading-snug"` — removes truncation entirely, uses slightly smaller text that wraps if needed, with tight line-height so a 2-line saying still looks elegant.

### Result
- Every saying displays in full — no truncation, no "…"
- On mobile: `text-xs` with wrapping keeps it legible and contained
- On desktop: `text-sm` with up to 340px width fits comfortably
- Logo text remains unchanged at its current size

