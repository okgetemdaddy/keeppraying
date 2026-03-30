

## Fix: Authenticated Recipients Can't View Shared Private Prayers

### Root Cause

The `prayer_cards` RLS policies are:
1. "Users can view own prayers" — `auth.uid() = created_by`
2. "Anyone can view approved prayers" — `status IN ('approved', 'ai_generated')`
3. "Anon can read shared prayers" — checks `prayer_shares` but scoped to `TO anon` only
4. "Admins can manage all prayers" — admin only

When a private prayer is shared, the recipient is authenticated but is NOT the creator, the prayer is NOT approved (it's "private"), and the anon policy doesn't apply to authenticated users. So the query returns null → error screen.

### Fix — One Database Migration

Add a SELECT policy on `prayer_cards` for the `authenticated` role that allows reading prayers shared with the current user:

```sql
CREATE POLICY "Authenticated can read prayers shared with them"
  ON public.prayer_cards FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.prayer_shares ps
      WHERE ps.prayer_id = prayer_cards.id