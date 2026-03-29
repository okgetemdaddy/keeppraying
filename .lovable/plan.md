

## Prayer Station Overhaul Plan

This is a significant refactor of the `/board` page with 5 interconnected changes. Here is the full plan:

---

### 1. Hero Section with Personalized Title + Incense Animation

**What**: A dark-toned hero section at the top of the board content area displaying "{First Name}'s Prayer Station" with a daily AI-generated welcome message and rising incense smoke animation.

- Extract user's first name from `user.user_metadata.full_name` (split on space, take first element, fallback to "Your")
- Title: `"{firstName}'s Prayer Station"` in large display font, white text
- Daily welcome message: Call Gemini Flash via an edge function (`daily-welcome`) that generates a short, edifying greeting (cached per user per day in a new `daily_welcome_messages` table)
- Background: Dark gradient (`hsl(215 28% 12%)` to `hsl(220 25% 8%)`) with CSS/canvas-based rising incense animation — thin, wispy smoke tendrils rising slowly using layered animated SVG paths or CSS pseudo-elements with blur + opacity keyframes
- Move the hamburger menu links (Circles, Family Rooms, Add Prayer, Playlist, Classical Prayers) into this hero section as compact icon+label pill buttons in a horizontally scrollable row

**DB migration**: Create `daily_welcome_messages` table with columns: `id uuid`, `user_id uuid`, `message text`, `active_date date`, `created_at timestamptz`. RLS: users can read/insert own rows.

**Edge function**: `daily-welcome/index.ts` — calls Gemini 2.5 Flash Lite to generate a 1-2 sentence edifying welcome. Checks if today's message exists first; if so, returns cached.

### 2. Delete Hamburger Menu + Cleanup

- Delete `src/components/board/BoardMobileMenu.tsx` entirely
- Remove all imports and references from `Board.tsx`
- The mobile nav bar simplifies to just logo + notification bell (no hamburger)
- All navigation actions formerly in the hamburger are now in the hero section's action pills

### 3. Search Bar (Above Sort/Filter Row)

**What**: A search bar styled similarly to `/prayers` but tailored for the user's own content — searches across saved prayers (title, text, labels), breath prayers, circles, family rooms.

- Placed immediately above the All/Pinned/Favorites filter row
- Glassmorphic style matching the board theme (semi-transparent background, rounded-2xl)
- Client-side filtering: filters `displayedItems` by matching search query against `prayer_cards.title`, `prayer_cards.prayer_text`, and `prayer_cards.labels`
- Search icon left, clear X button right when active
- Placeholder: "Search your prayers, groups, events..."

### 4. Tighten Single-Column Card Spacing

**What**: Reduce the gap between prayer cards in single-column mobile layout for a tighter, journal-like scroll feel.

- Change single-column grid gap from `gap-4` to `gap-2` on mobile (keep `md:gap-6` for desktop)
- Reduce container `py-8` to `py-4` on mobile
- This applies to the `one-col` layout path in the grid className

### 5. Auto-Hide Top Nav on Interaction

**What**: The sticky top nav bar hides when the user scrolls down or interacts with content, and reappears when scrolling up.

- Add scroll direction detection (`useRef` for last scroll position)
- When scrolling down past ~60px, animate nav `y: -100%` with opacity fade
- When scrolling up, animate nav back into view
- Use Framer Motion's `animate` prop on the existing `motion.div` wrapping the header

---

### Technical Summary

| Change | Files Modified/Created |
|---|---|
| Hero section + incense animation | `Board.tsx`, new `daily-welcome` edge function, DB migration |
| Delete hamburger menu | Delete `BoardMobileMenu.tsx`, edit `Board.tsx` |
| Search bar | `Board.tsx` |
| Tighter card spacing | `Board.tsx` (grid className) |
| Auto-hide nav | `Board.tsx` (scroll listener + motion) |

### Rename
All UI references to "Board" become "Prayer Station" (page title, empty state, etc.).

