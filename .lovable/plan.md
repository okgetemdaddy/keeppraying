

# YouVersion OAuth Callback Route

## Summary
Create an `/auth/youversion/callback` route that handles the YouVersion OAuth PKCE token exchange, renders a sacred loading state during the brief exchange, then redirects the user back to where they came from.

## Why `/auth/youversion/callback` (not `/auth/callback`)
The app already has `/auth` for its own login page and `/reset-password` for password resets. Using a YouVersion-specific path avoids any routing conflicts and makes redirect URI configuration in the YouVersion Developer Portal clear and unambiguous.

## Technical Details

### New file: `src/pages/YouVersionCallback.tsx`
- On mount, extract `code` and `state` from URL search params via `useSearchParams`
- Pass them to the YouVersion core client to complete the PKCE token exchange
- Store the resulting access/refresh tokens (localStorage or a context — will align with the `use-youversion` hook design from the main plan)
- On success, redirect via `useNavigate` to the page the user came from (stored in `state` param or fallback to `/board`)
- On error, show a brief toast and redirect to `/board`
- **UI during exchange**: Full-page dark background with the existing `SacredSpinner` component ("Connecting to YouVersion…") — no bright spinners, no buttons, fully automatic

### Route registration in `src/App.tsx`
- Add: `<Route path="/auth/youversion/callback" element={<YouVersionCallback />} />`
- Placed alongside the existing `/auth` and `/reset-password` routes
- No `AuthGate` wrapper — the callback must be accessible mid-OAuth flow

### Files changed

| File | Change |
|------|--------|
| `src/pages/YouVersionCallback.tsx` | New: callback page component |
| `src/App.tsx` | Add route for `/auth/youversion/callback` |

### Dependency on main plan
This callback route will call into `src/lib/youversion/client.ts` (the `ApiClient` token exchange method) which is created in the main YouVersion integration plan. Both will be implemented together — the callback route first, then the client/hooks/components.

### Redirect URI to configure
The user will need to register these callback URLs in the YouVersion Developer Portal:
- `https://keeppraying.lovable.app/auth/youversion/callback`
- `https://id-preview--ec544a6b-3366-4547-b914-c619394e5a03.lovable.app/auth/youversion/callback`

