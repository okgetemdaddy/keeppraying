

# One-Time Auto-Redirect to /board

## Problem
The logo links to `/`. The Index page unconditionally redirects logged-in users to `/board`. So clicking the logo always bounces them back to `/board` — they can never see the landing page.

## Fix
Use `sessionStorage` to ensure the auto-redirect only fires once per browser session.

### File: `src/pages/Index.tsx` (lines ~360-364)

Change the existing redirect effect from:
```tsx
useEffect(() => {
  if (!loading && user) {
    navigate("/board", { replace: true });
  }
}, [user, loading, navigate]);
```

To:
```tsx
useEffect(() => {
  if (!loading && user) {
    const key = "kp_board_redirected";
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, "1");
      navigate("/board", { replace: true });
    }
  }
}, [user, loading, navigate]);
```

This means:
- **First visit** (login, opening the app) → auto-redirect to `/board` ✓
- **Clicking the logo after that** → shows the landing page `/` ✓
- **New browser session** → redirects again ✓

One file, ~3 lines changed.

