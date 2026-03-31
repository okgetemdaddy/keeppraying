

## Persistent 30-Day Sessions + Auto-Redirect to Prayer Station

### What changes

**1. Index page (`src/pages/Index.tsx`)**
- Add a redirect at the top of the component: if `user` is logged in, `navigate('/board')` immediately
- Unauthenticated visitors still see the landing page as-is

**2. Auth page (`src/pages/Auth.tsx`)**
- After successful sign-in, redirect to `/board` instead of `/` (if not already doing so)

**3. Session duration**
- The Supabase client file is auto-generated and cannot be edited. However, the session already persists via `persistSession: true` + `autoRefreshToken: true`, which keeps users signed in as long as the refresh token is valid. The default Supabase refresh token lifetime is 30 days, so **no code change is needed** for session persistence — it already lasts ~30 days by default.

### Files changed
1. `src/pages/Index.tsx` — add `useEffect` redirect to `/board` when user is authenticated
2. `src/pages/Auth.tsx` — ensure post-login redirect goes to `/board`

