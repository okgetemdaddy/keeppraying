

## Dev-Only 5-Tap Admin Bypass

When in Lovable preview/dev mode (`import.meta.env.DEV`), tapping the hero title 5 times sets a dev bypass flag and navigates straight to `/admin` — no login required.

### How it works

1. **`src/pages/Index.tsx`** — Add a tap counter on the hero `<h1>`. After 5 taps within 3 seconds, if `import.meta.env.DEV` is true, set `sessionStorage.setItem('DEV_ADMIN_BYPASS', 'true')` and navigate to `/admin`.

2. **`src/contexts/AuthContext.tsx`** — In dev mode, check for the `DEV_ADMIN_BYPASS` flag. If set, override `isAdmin` to `true` and provide a synthetic user object so all auth-gated UI works without a real session.

3. **`src/App.tsx`** — `AdminRoute` already reads `isAdmin` from context, so it will automatically allow access when the bypass is active.

### Security

- All bypass logic is gated behind `import.meta.env.DEV` — completely stripped from production builds by Vite's tree-shaking.
- Only works in Lovable preview URLs and local dev.
- DB mutations that require a real session will still fail (RLS), but page navigation and UI are fully accessible.

### Files changed
1. `src/pages/Index.tsx`
2. `src/contexts/AuthContext.tsx`

