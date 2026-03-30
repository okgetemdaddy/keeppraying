

## Plan: Cross-Device Sync for Sermon Progress & Preferences

### Problem
Two pieces of sermon-related user data are stored in `localStorage` and lost when switching devices:
1. **Completed application points** (`sermon-app-completed`) in `SermonApplicationPoints.tsx`
2. **Prayer notification time preferences** (`sermon-prayer-notif-times`) in `SermonSync.tsx`

### Solution
Store both in a new `user_sermon_progress` database table keyed by `user_id`, with a single JSONB column for flexibility. Load on mount, write-through on change (debounced), with localStorage as fast cache.

### Changes

#### 1. Database Migration: `user_sermon_progress`
```sql
CREATE TABLE public.user_sermon_progress (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_points jsonb DEFAULT '{}',   -- { "cardId:pointIdx": true }
  notif_times jsonb DEFAULT '{}',        -- { "Monday": "Morning", ... }
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.user_sermon_progress ENABLE ROW LEVEL SECURITY;
-- Authenticated users can read/write only their own row
CREATE POLICY "Users manage own progress" ON public.user_sermon_progress
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

Key change: completed points will be keyed by **prayer card ID + point index** (e.g. `"abc123:0"`) instead of just a global index, so progress is scoped per sermon card.

#### 2. New Hook: `src/hooks/useSermonProgress.ts`
- Fetches the user's row on mount, falls back to localStorage for instant display
- Exposes `completedPoints`, `notifTimes`, `markPointCompleted(cardId, idx)`, `setNotifTime(day, time)`
- Debounced upsert to database (800ms), immediate localStorage write for responsiveness
- On load, merges cloud data into localStorage cache

#### 3. Update: `src/components/board/SermonApplicationPoints.tsx`
- Accept `cardId` prop (the prayer card's ID)
- Replace raw localStorage reads/writes with the `useSermonProgress` hook
- `completedPoints` keyed as `"cardId:idx"` instead of bare index

#### 4. Update: `src/pages/SermonSync.tsx`
- Replace `getNotifTimes()` / `setNotifTime()` localStorage helpers with the same hook
- Notification time preferences sync to database

#### 5. Update: `src/components/board/BoardCard.tsx`
- Pass `card.id` as `cardId` prop to `SermonApplicationPoints`

### Files

| File | Action |
|---|---|
| DB migration | New — `user_sermon_progress` |
| `src/hooks/useSermonProgress.ts` | New |
| `src/components/board/SermonApplicationPoints.tsx` | Update |
| `src/pages/SermonSync.tsx` | Update |
| `src/components/board/BoardCard.tsx` | Update (pass cardId) |

