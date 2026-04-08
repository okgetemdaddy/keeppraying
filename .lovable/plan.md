

## Marketing Overlay for Landing Page (`/`)

### What We're Building

A full-screen animated overlay that appears on top of the landing page for unauthenticated visitors. It presents John's message about the vision behind KeepPray.ing, formatted as a cinematic scroll experience, and ends with an email waitlist signup for the official launch. Authenticated users skip it entirely (they already redirect to `/board`).

### Design Direction

- **Dark, reverent aesthetic** — zinc-950 background with gold (hsl 42 85% 46%) accents, matching existing brand
- **Animated text reveal** — body copy splits into meaningful paragraphs that fade/slide in as the user scrolls or with staggered timing
- **Dismissible** — "Enter Site" button or scroll-past to close; state saved to localStorage so it only shows once per device
- **Waitlist CTA** — email input at the bottom using the existing `waitlist_signups` table with `platform: "keeppray_launch"`

### Content Formatting

The body copy will be split into 3 emotionally distinct sections with staggered animation:

1. **The Problem** — "When people say they are praying for us..." → italic serif, larger text, opening hook
2. **The Mission** — "At KeepPray.ing we encourage..." → standard body, describes the ministry
3. **The Story** — "My name is John..." → personal, warm, slightly smaller, includes the emojis naturally

Each section fades up with a delay. A "KINGDOM PRAYERS" tagline anchors the top.

### Technical Plan

**New file: `src/components/LaunchOverlay.tsx`**
- Full-screen fixed overlay (`z-[100]`) with `AnimatePresence`
- Uses `framer-motion` staggered `fadeUp` variants (matching existing Index.tsx patterns)
- Email input + submit button at bottom → inserts into `waitlist_signups` with `platform: "keeppray_launch"`
- "Enter Site →" dismiss button saves `kp_launch_overlay_seen` to localStorage
- Only renders when `!user && !localStorage.getItem("kp_launch_overlay_seen")`

**Modified file: `src/pages/Index.tsx`**
- Import and render `<LaunchOverlay />` at the top of the return, before the nav
- No other changes to the existing page

### Files Changed

| File | Change |
|------|--------|
| `src/components/LaunchOverlay.tsx` | New — full marketing overlay component |
| `src/pages/Index.tsx` | Add `<LaunchOverlay />` render |

