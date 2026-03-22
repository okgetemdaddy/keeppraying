
## Plan: Standalone TestimonyCards + Prayer Link Reference + Board Testify Button + Prayer Input Redesign

### What's being built (4 distinct pieces):

---

### 1. Standalone TestimonyCard — Prayer link reference + "read more"

**`src/pages/Testify.tsx`** — Redesign `TestimonyFlipCard` into `StandaloneTestimonyCard`:

The current card flips to show the prayer. Instead:
- **Text is the hero** — large `font-display` quote with generous leading, full width
- `read more...` inline expansion with `AnimatePresence` for body > 500 chars (no flip needed for text)
- **Prayer reference pill** always visible — linked to the original prayer: `→ "Prayer Title" · 4 testimonies` — this is a clickable `<Link to="/prayer/{prayer_id}">` that navigates to the public prayer page. Shows testimony count for that prayer (fetched in the same query).
- **2.5D hover effect**: `whileHover={{ rotateX: 3, rotateY: -2, scale: 1.01, y: -3 }}` with `perspective: 1000px` on parent, multi-layer gold ambient box-shadow
- Gold decorative `"` quote mark as background element (absolute, large, gold, low opacity)
- Glass sheen overlay: subtle `linear-gradient` diagonal from `rgba(255,255,255,0.06)` to transparent
- Author avatar + name + date in top row
- **"See the Prayer 🙏"** remains but becomes a Sheet slide-in (not flip) showing full prayer text — cleaner UX
- Footer: like (count), share (copy link), flag, comment count badge

**Fetch testimony count per prayer**: add a `testimony_counts` map by `prayer_id` in the main fetch — group testimonies by prayer_id client-side to get count, or use the already-loaded testimonies array.

---

### 2. `/testify` — Add a Testify button with auth-redirect intent

In the `/testify` hero section, add a prominent **"Share Your Testimony 🕊️"** `Button`:
- If `user` is logged in → opens a `Sheet` with the standalone testimony submission form (textarea + optional prayer picker + submit → `moderate-testimony` → insert)
- If `user` is NOT logged in → save the intent to `sessionStorage` (`{ redirectAfter: '/testify', action: 'testify' }`), then `navigate('/auth')`
- On `/auth` page, after successful login, check `sessionStorage` for a pending intent and redirect accordingly — the user lands back at `/testify` and the sheet opens automatically via a `?testify=1` query param

**Auth redirect pattern**:
- Pre-login: `sessionStorage.setItem('postLoginRedirect', '/testify?testify=1')`
- In `Auth.tsx` after sign-in success: `const redirect = sessionStorage.getItem('postLoginRedirect'); navigate(redirect || '/');`
- In `Testify.tsx`: `useEffect` checks `searchParams.get('testify') === '1'` and opens the sheet

---

### 3. Board `/board` — Testify button

In `src/pages/Board.tsx` header action row (next to "Add Prayer"):
- Add `testifyOpen` state
- Add `<Button>` with `Bird` or `Sparkles` icon: **"Testify 🕊️"**
- Opens a `Sheet` from the right:
  - Title: "Share a Testimony"
  - Description: "Tell the story of how God moved — no prayer card required."
  - Textarea (4000 chars) + char counter
  - Optional: prayer picker (dropdown of user's own prayers) to optionally link to a prayer
  - Submit → calls `moderate-testimony` edge function → inserts `{ user_id, body, prayer_id: null or selected }`
  - Success toast + sheet close

**DB**: `testimonies.prayer_id` is currently `NOT NULL`. Need a migration to make it nullable for standalone testimonies. This is the same migration flagged in the last plan summary.

---

### 4. AddPrayerModal — Immersive prayer input redesign

**`src/components/AddPrayerModal.tsx`**:

The modal becomes a **full-screen Dialog** on desktop (`max-w-2xl` → `max-w-3xl sm:max-w-4xl`) with the writing area as the dominant element.

Changes:
- **Dialog content**: wider (`max-w-3xl`), taller (`min-h-[85vh]` on desktop), two-column layout on `sm:` — left column = form, right column = live preview card (currently preview is below the textarea and takes up space)
- **Prayer textarea**: dramatically larger — `rows={12}` minimum, `min-h-[280px]`, with:
  - `font-display` (Playfair Display) for the actual prayer text — feels sacred, readable
  - `text-lg leading-[1.9]` for generous breathing room
  - Custom CSS: `box-shadow: inset 0 2px 12px hsl(42 75% 46% / 0.08)` (inner golden glow), `border: none`, `background: hsl(38 55% 99%)` (warmest cream)
  - Glass sheen on focus: `focus-visible:ring-0 focus-visible:shadow-[inset_0_0_0_1.5px_hsl(42_75%_55%),inset_0_2px_16px_hsl(42_75%_46%_/_0.10)]`
  - Placeholder text: `"Lord, I come before you today…"` (prayerful, not generic)
  - Auto-grow height as user types (via a `useRef` + `onInput` height adjust trick)
- **Title input**: styled to look like a section heading input — larger font (`text-xl`), minimal border, warm background
- **Preview**: moved to right column (`hidden sm:block`) — no longer stacks below the textarea eating vertical space. On mobile it's replaced by a small style badge.
- **Extended prayer / Scripture**: collapsed behind an `<Accordion>` or expandable chevron — not shown by default, declutters the primary writing experience
- **Background upload**: similarly collapsed into an "Extras ↓" accordion
- **Word counter**: small, floating in bottom-right corner of the textarea, not below it
- **Overall feel**: the modal should feel like opening a prayer journal — warm cream background, no harsh borders, soft inner shadows, faith-adjacent typography

---

### Database migration needed

```sql
ALTER TABLE public.testimonies ALTER COLUMN prayer_id DROP NOT NULL;
```

---

### Files to modify

| File | Change |
|---|---|
| `supabase/migrations/...` | Make `testimonies.prayer_id` nullable |
| `src/pages/Testify.tsx` | Replace `TestimonyFlipCard` with `StandaloneTestimonyCard` (2.5D, read more, prayer link pill, testimony count, Testify button + auth redirect) |
| `src/pages/Board.tsx` | Add "Testify 🕊️" button + Sheet with standalone form |
| `src/pages/Auth.tsx` | Read `sessionStorage` post-login redirect intent |
| `src/components/AddPrayerModal.tsx` | Full redesign — wider dialog, dominant textarea, auto-grow, inner shadows, glass sheen, right-column preview, collapsed extras |
| `src/integrations/supabase/types.ts` | Update `testimonies.prayer_id` to `string | null` |

---

### Technical details

- `StandaloneTestimonyCard` counts other testimonies for the same prayer by grouping the already-fetched testimonies array by `prayer_id` — zero extra DB queries
- Auth intent: `sessionStorage` key `'kp_post_login'` stores `{ path, action }` — cleared after use
- Auto-grow textarea: `ref.style.height = 'auto'; ref.style.height = ref.scrollHeight + 'px'` on `onInput`
- The 2.5D card uses `style={{ perspective: '1000px' }}` on wrapper and `whileHover` on the card `motion.div` — same pattern already used in `BoardCard`
