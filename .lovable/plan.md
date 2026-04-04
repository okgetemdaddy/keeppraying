

## Study Mode Gate: Auth → Premium → Resume → Create

### Overview
Wire a strict gate sequence before the Canvas Creation Drawer opens. Three new state variables, one async gate function, and two new bottom sheet components (PremiumUpsellSheet, ResumeOrNewSheet).

### Key Discovery
**No premium/subscription infrastructure exists yet.** The `profiles` table has `is_donor` and `is_founder` but no `is_premium` or subscription field. We need to either:
- Add a `subscription_tier` column to profiles (requires migration), or
- Use `is_donor || is_founder` as a temporary premium proxy

Since building a full subscription system is out of scope here, the plan will use a simple `is_premium` boolean derived from a new `subscription_tier` column on `profiles` (with a migration), defaulting all existing users to `'free'`. This gives a clean hook for Stripe integration later.

### Changes

#### 1. Database Migration
Add `subscription_tier` column to `profiles`:
```sql
ALTER TABLE public.profiles 
ADD COLUMN subscription_tier text NOT NULL DEFAULT 'free';
-- Founders get premium
UPDATE public.profiles SET subscription_tier = 'premium' WHERE is_founder = true;
```

#### 2. New file: `src/components/bible/PremiumUpsellSheet.tsx`
Bottom sheet (Framer Motion, matching existing drawer spring config). Not backdrop-dismissible.
- Animated SVG ink stroke drawing across parchment (CSS stroke-dashoffset animation)
- Headline: "Study deeper."
- Feature list with amber diamond bullets (3 rows)
- "Unlock Premium" CTA (amber, full-width) — placeholder `onClick` (no paywall yet, shows toast "Coming soon")
- "Maybe later" ghost button → closes
- Fine print: "Restores on all your devices. Cancel anytime."
- iPadOS dev comments inline

#### 3. New file: `src/components/bible/ResumeOrNewSheet.tsx`
Half-height bottom sheet. Not backdrop-dismissible. Props: `open`, `session: StudySession`, `onResume`, `onStartNew`, `onClose`.
- "YOUR LAST SESSION" label
- Session card showing book+chapter (derived from `book_usfm`), verse range, elapsed time (formatted), relative last-active time, status pill (green/amber)
- Thumbnail placeholder with dot-grid texture
- Two buttons: "✦ Resume" (amber solid) and "Start New" (ghost)
- iPadOS dev comments inline

#### 4. Edit: `src/components/bible/BibleReader.tsx`
- **New state**: `showPremiumUpsell`, `showResumeOrNew`, `existingSession`
- **New imports**: `PremiumUpsellSheet`, `ResumeOrNewSheet`, `StudySession` type
- **Fetch user profile** for `subscription_tier` — add a simple query near existing auth usage (or a small hook)
- **Replace `handleToggleStudyMode`** with `handleStudyModeEntry`:
  - Step 1: Check `user` — if null, show auth gate (reuse existing FloatingToolbar auth pattern: set a state that triggers the auth benefit sheet)
  - Step 2: Check `subscription_tier !== 'premium'` → `setShowPremiumUpsell(true)`
  - Step 3: Query `study_sessions` for active/paused session → if found, show ResumeOrNewSheet
  - Step 4: No session → `setCanvasCreationOpen(true)`
- **Gate comment block** added above the function (the ASCII diagram from the spec)
- **`handleResume`**: close sheet, set session config, restore camera via ref + applyTransform, mark active, start heartbeat
- **`handleStartNew`**: pause existing session, close sheet, open CanvasCreationDrawer
- **Wire all callsites**: Replace every reference to `handleToggleStudyMode(true)` with `handleStudyModeEntry()`. The Apple Pencil auto-detect also calls this gate. Turning study mode OFF stays as-is (no gate needed for exit).
- **JSX**: Add `<PremiumUpsellSheet>` and `<ResumeOrNewSheet>` near other bottom sheets

#### 5. Edit: `src/components/bible/iPadStudyToolbar.tsx`
- Update the study mode toggle callback to call the new gate function (passed as prop) instead of directly toggling

### Files Summary

| File | Action |
|------|--------|
| Migration SQL | Add `subscription_tier` to profiles |
| `src/components/bible/PremiumUpsellSheet.tsx` | New — premium upsell bottom sheet |
| `src/components/bible/ResumeOrNewSheet.tsx` | New — resume vs new session sheet |
| `src/components/bible/BibleReader.tsx` | Gate logic, new state, wire sheets, replace handler callsites |
| `src/components/bible/iPadStudyToolbar.tsx` | Pass gate handler instead of direct toggle |

