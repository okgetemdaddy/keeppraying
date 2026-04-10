

## Grand Reveal: Premium Marketing Landing + Route Lockdown

### What We're Building

1. **Lock down all routes** — redirect every path except `/`, `/auth`, `/admin`, `/reset-password`, and `/shared-prayer/:token` to `/`. Authenticated users still reach `/board` and `/admin` via the existing redirect logic. All other pages become inaccessible to the public until the grand reveal.

2. **Replace the LaunchOverlay** with a full-page premium marketing landing that IS the `/` page for unauthenticated users — not a dismissible overlay, but the actual experience. No "Enter Site" escape hatch.

3. **Build a showpiece 3D flipping prayer card** using CSS 3D transforms (no Three.js needed — keeps it lightweight and performant). The card auto-rotates on a slow loop:
   - **Front**: A styled prayer card with handwritten-style text, showing a real prayer
   - **Back**: The testimony side — "God answered" — with a golden glow reveal
   - User can tap/click to flip manually; auto-rotation pauses on interaction

4. **Feature showcase sections** below the hero, each with scroll-triggered animations:
   - **Voice, Handwritten, or Typed** — three input modes illustrated with icons and micro-animations
   - **Public or Private** — toggle visual showing the privacy spectrum
   - **Share Your Prayer** — "Let someone FEEL that you're praying for them"
   - **Testify When God Answers** — the flip card concept explained with the card rotating
   - **Comment & Encourage** — community interaction
   - **Prayer Circles** — accountability and unity, group visual

5. **Waitlist CTA** — sticky/repeated email signup form using existing `waitlist_signups` table

6. **John's story** — the personal founder narrative, reformatted as a cinematic closing section

### Technical Plan

**Modified: `src/App.tsx`**
- Wrap all non-essential routes in a `PreLaunchGuard` that redirects unauthenticated users to `/`
- Keep `/auth`, `/admin`, `/reset-password`, `/shared-prayer/:token`, `/upload` accessible
- Authenticated users bypass the guard entirely (they go to `/board` per existing logic)

**Replaced: `src/components/LaunchOverlay.tsx`**
- Complete rewrite as the premium marketing page component
- Full-page sections with `framer-motion` scroll-triggered reveals
- 3D prayer card using CSS `perspective` + `rotateY` transforms with auto-rotation
- Feature grid with staggered fade-up animations
- Waitlist form (reuses existing Supabase insert)
- John's story as closing section
- Login link for existing users

**Modified: `src/pages/Index.tsx`**
- For unauthenticated users: render only `<LaunchOverlay />` as the full page (no landing page behind it)
- For authenticated users: existing redirect to `/board` already handles this

### Files Changed

| File | Change |
|------|--------|
| `src/components/LaunchOverlay.tsx` | Full rewrite — premium marketing page with 3D prayer card, feature sections, waitlist |
| `src/pages/Index.tsx` | Render LaunchOverlay as full page for unauth users |
| `src/App.tsx` | Add route guard redirecting all non-essential paths to `/` for unauth users |

