

# Update BibleFeaturesTour Branding for KeepRead.ing

## What Changes

The `BibleFeaturesTour` component (`src/components/bible/BibleFeaturesTour.tsx`) is the welcome intro slide shown to first-time/anonymous users. It needs hostname-aware branding:

### When on KeepRead.ing (`isKeepReading() === true`):
- **Title**: "Welcome to KeepRead.ing ✨" (instead of "Welcome to God's Word ✨")
- **Subtitle**: "Keep Reading. Go Deeper. Here's everything you can do." (instead of current description)
- **Acknowledge button**: "Start Reading" (instead of "Thanks for letting me know")

### When on KeepPray.ing:
- Everything stays exactly as-is (no changes)

### File Modified
- `src/components/bible/BibleFeaturesTour.tsx` — import `isKeepReading` from `hostDetect`, conditionally render title/subtitle/button text

This is a small, self-contained change inside the existing plan's scope — just adding the `isKeepReading()` conditional to the one component that was missed.

