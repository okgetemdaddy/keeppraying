

## Fix: Restrict `prayed_actions` Public Read Access

### Problem
The `prayed_actions` table has a SELECT policy `"Anyone can view prayed count"` with `USING (true)` on the `public` role, exposing all user prayer activity (user UUIDs, prayer IDs, timestamps) to unauthenticated visitors.

### Solution
Drop the permissive public SELECT policy and replace it with an authenticated-only policy that lets users see their own prayed actions. The aggregate prayed counts are already stored on `prayer_cards.prayed_count`, so no functionality is lost.

### Migration SQL
```sql
DROP POLICY IF EXISTS "Anyone can view prayed count" ON prayed_actions;

CREATE POLICY "Authenticated users can view own prayed actions"
  ON prayed_actions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
```

### Files Changed
| File | Change |
|------|--------|
| New migration | Drop public SELECT, add authenticated owner-only SELECT |

No code changes needed — the app already queries `prayed_actions` as an authenticated user filtering by `user_id`.

