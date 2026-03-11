
## Plan: Add a Dev Mode Toggle to Bypass Auth

The cleanest approach is to add a single constant flag `DEV_BYPASS_AUTH` at the top of `src/App.tsx`. When `true`, both `ProtectedRoute` and `AdminRoute` render their children directly without any auth check. When `false` (the default for production), everything works exactly as before.

**Changes needed — one file only:**

`src/App.tsx`
- Add `const DEV_BYPASS_AUTH = true;` at the top (easy to flip back to `false`)
- In `ProtectedRoute`: if `DEV_BYPASS_AUTH` is true, skip the loading/user checks and just render children
- In `AdminRoute`: same — skip auth/admin checks and just render children

**To re-enable auth later:** change `DEV_BYPASS_AUTH` to `false` — one character edit.

No database, no edge function, no other file changes needed.
