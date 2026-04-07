

## Diagnosis: Admin Page Access Issues After RLS Changes

### What I Found

1. **Your user account IS correctly set as admin** — the `has_role()` function confirms `role = 'admin'` for your user ID.

2. **All tables have RLS enabled** — every table the admin page queries (`prayer_cards`, `testimonies`, `profiles`, `contact_submissions`, `admin_reports`, `blog_posts`) has RLS turned on with policies.

3. **Inconsistent admin policy patterns** — this is the likely culprit:
   - Some tables use the safe `has_role(auth.uid(), 'admin')` function (SECURITY DEFINER, bypasses RLS)
   - Others (`blog_posts`, `contact_submissions`) use a direct subquery: `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')` — this is subject to RLS evaluation chains and can cause subtle failures

4. **No error handling on the admin data load** — `Promise.all` with 12 parallel queries in `Admin.tsx`. If ANY query throws or returns in an unexpected format, the entire page crashes with no recovery.

### Plan

**1. Standardize all admin RLS policies to use `has_role()`** (database migration)

Replace the direct `profiles` subquery pattern with the `has_role()` security definer function on these tables:
- `blog_posts` — "Admins can manage posts"
- `contact_submissions` — "Admins can view submissions"

This eliminates RLS evaluation chains where checking admin on table A requires querying `profiles` which itself has RLS.

**2. Add error handling to Admin page load** (`src/pages/Admin.tsx`)

Wrap the `Promise.all` in a try/catch so a single failing query doesn't crash the entire page. Show a toast with the error instead of a blank/crashed screen.

### Files Changed

| File | Change |
|------|--------|
| Migration SQL | Replace 2 RLS policies to use `has_role()` |
| `src/pages/Admin.tsx` | Add try/catch around `load()`, show error feedback |

