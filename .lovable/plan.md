

## Allow Dismissing the Auth Gate + Show "Changes saved only when signed in" Toast

### Problem
When an anonymous user triggers the "You're discovering something beautiful ✦" dialog and doesn't want to sign up, they're stuck — the desktop floating popover has no way to close it by clicking outside, and the mobile sheet dismisses but gives no feedback.

### Changes (single file: `src/components/bible/FloatingToolbar.tsx`)

**Mobile (bottom sheet):** Already dismissible via drag/tap-outside thanks to the Sheet's `onOpenChange`. Add a toast on dismiss: "Changes are only saved if you are signed in."

**Desktop (floating popover):**
1. Add a translucent full-screen backdrop behind the popover that calls `onDismiss` on click
2. On dismiss (backdrop click or X button), show a toast: "Changes are only saved if you are signed in." that auto-dismisses after ~3 seconds

### Implementation detail

- Import `useToast` (already available in the project)
- Wrap the desktop `motion.div` auth gate with a backdrop `div` (`fixed inset-0 z-40`) that calls a `handleDismissGuest()` function
- `handleDismissGuest` fires `toast({ title: "Changes are only saved if you are signed in." })` then calls `onDismiss()`
- For mobile, update the `onOpenChange` callback to also fire the same toast when `!open`

| File | Change |
|------|--------|
| `src/components/bible/FloatingToolbar.tsx` | Add click-outside dismiss + toast for both mobile and desktop auth gate |

