
## Forgot Password — Full Flow

Two things to build:

**1. Forgot Password mode on `/auth`**
Add a third mode `"forgot"` to the existing Auth page state machine. When the user clicks "Forgot password?" (a small link under the password field in Sign In mode), the form switches to a single email field with a "Send Reset Link" button. On submit it calls `supabase.auth.resetPasswordForEmail()` with a redirect to `/reset-password`. A success state then shows a confirmation message ("Check your inbox") so the user knows the email is on its way.

**2. New `/reset-password` page**
Create `src/pages/ResetPassword.tsx` — a new public route that:
- Detects the `type=recovery` token from the URL hash on mount (Supabase sets this when the user clicks the email link)
- Shows a "Set New Password" form (new password + confirm password fields)
- On submit calls `supabase.auth.updateUser({ password })` 
- On success navigates to `/auth` with a toast saying "Password updated — please sign in"
- Matches the same split-panel visual design as the Auth page (hero image left, form right)

**3. Register the route in `App.tsx`**
Add `<Route path="/reset-password" element={<ResetPassword />} />` as a public route (no auth wrapper).

**4. Add `resetPassword` to `AuthContext`**
Add `resetPassword(email: string)` to the context so it's callable from the Auth page cleanly, same pattern as `signIn` / `signUp`.

### Files changed
- `src/contexts/AuthContext.tsx` — add `resetPassword` method
- `src/pages/Auth.tsx` — add `"forgot"` mode, "Forgot password?" link, success state
- `src/pages/ResetPassword.tsx` — new page (created)
- `src/App.tsx` — register `/reset-password` route
