
## Grant Admin Role to jwlesley@gmail.com

This is a pure database data operation — no code changes required.

### What needs to happen

The `profiles` table has a `role` column (default `'user'`). Admin access is checked via the `has_role()` security definer function, which reads from this column. To grant admin access, the role simply needs to be updated to `'admin'` for the matching profile row.

### Single database update

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'jwlesley@gmail.com';
```

This will:
1. Find the profile row for `jwlesley@gmail.com`
2. Set `role = 'admin'`
3. The next time that user signs in (or refreshes), `has_role()` returns `true` and they gain access to the `/admin` dashboard

### No code changes needed
The RBAC system is already fully in place — `has_role()`, the `AdminRoute` guard in `App.tsx`, and the `checkAdmin` call in `AuthContext` are all wired up correctly. This is just flipping the role value in the database.
