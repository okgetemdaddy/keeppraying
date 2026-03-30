

## Rich Link Previews + Landing Page Flow Fix

### Problem
1. **No rich link preview**: When shared via iMessage/WhatsApp, the link shows generic site OG tags because the SPA can't serve dynamic meta tags to crawlers.
2. **Landing page CTA broken**: The "Sign In" button links to `/auth?redirect=...` but `Auth.tsx` reads `sessionStorage("kp_post_login")`, not query params — so the redirect back to the prayer never happens.
3. **Public vs private distinction**: Public prayers should show "See Prayer" (no auth needed), private should show "Sign In to See Your Prayer".

### Changes

#### 1. New edge function: `supabase/functions/og-prayer-preview/index.ts`

Serves dynamic HTML with OG meta tags for messaging app crawlers, then redirects humans to the SPA.

- Accepts `?token=<share_token>`
- Queries `prayer_shares` → `prayer_cards` → sender `profiles` using service role
- Returns HTML with:
  - `og:title`: "{SenderName} shared a prayer with you"
  - `og:description`: "A prayer shared with love on KeepPray.ing" (no prayer text preview — respects privacy)
  - `og:image`: prayer `background_url` if available, else a default OG image (site logo/brand)
  - `og:url`: canonical SPA URL
  - `twitter:card`: `summary_large_image`
  - `<meta http-equiv="refresh" content="0;url=...">` + JS redirect to `/shared-prayer/${token}`
- If token invalid/expired: redirect to homepage

#### 2. Update share link in `SharePrayerModal.tsx` (line 137)

Change from:
```ts
const link = `${window.location.origin}/shared-prayer/${token}`;
```
to:
```ts
const link = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/og-prayer-preview?token=${token}`;
```

#### 3. Fix redirect after sign-in in `SharedPrayerLanding.tsx`

The sticky CTA currently links to `/auth?redirect=...` but Auth.tsx doesn't read query params. Fix: set `sessionStorage` before navigating.

Change the sign-in link from a `<Link>` to an `onClick` handler that:
```ts
sessionStorage.setItem("kp_post_login", JSON.stringify({ path: `/shared-prayer/${token}` }));
navigate("/auth");
```

#### 4. Public vs Private prayer distinction in `SharedPrayerLanding.tsx`

The prayer data is already fetched (via the anon RLS policy from the previous migration). Check `prayer.prayer_text` — if it loaded with real content (not the placeholder), the prayer is accessible.

- **Public/accessible prayer (anon can read it)**: Bottom CTA says **"See Prayer"** and instead of navigating to auth, it scrolls/fades to reveal the full prayer inline (or navigates to `/prayer/${prayer.id}`)
- **Private prayer (prayer is placeholder)**: Bottom CTA says **"Sign In to See Your Prayer"** with the sessionStorage redirect flow

Add a `const isAccessible = prayer.prayer_text !== "Sign in to read this prayer — it was sent with love."` check to distinguish.

For the public flow: the landing page fades out with a `motion.div` exit animation and reveals the full prayer content underneath — same authenticated prayer view but without needing auth.

#### 5. Add `prayer_type` to the fetch query

In `SharedPrayerLanding.tsx` line 114, add `prayer_type` to the select so we can check if it's a community (public) prayer vs personal (private).

### Files changed
- **New**: `supabase/functions/og-prayer-preview/index.ts`
- **Edit**: `src/components/SharePrayerModal.tsx`