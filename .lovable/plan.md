

## Fix: Add User Profile & Admin Access on Mobile

### Root Cause

In `SiteNav.tsx`, the `UserMenu` component (avatar + dropdown with Admin Dashboard, Profile, Board, Sign Out) is only rendered on desktop (`!isMobile`). On mobile, only the `NotificationBell` shows. There is no alternative mobile path to access the profile, admin page, or sign out.

### Solution

Add the `UserMenu` to the mobile section of `SiteNav` so mobile users see their profile avatar and can access the dropdown (including Admin Dashboard).

### Changes

**File: `src/components/SiteNav.tsx`**

Replace the mobile auth section (lines 326–334) to include `UserMenu` alongside `NotificationBell`:

```text
Current mobile section:
  {isMobile && session && <NotificationBell />}
  {isMobile && !session && <Link to="/auth">...</Link>}

Updated mobile section:
  {isMobile && session && <NotificationBell />}
  {isMobile && session && <UserMenu dark={dark} scrolled={scrolled} />}
  {isMobile && !session && <Link to="/auth">...</Link>}
```

This adds the same avatar circle + dropdown menu that desktop users see. The dropdown already contains:
- Admin Dashboard (visible only when `isAdmin` is true)
- My Profile
- My Board
- Sign Out

No other files need to change. The `UserMenu` component is already fully functional and responsive — it just wasn't being rendered on mobile.

