
## Testify Feature — Full Implementation Plan

### Summary of additions based on approved plan + user refinements:
- Any authenticated user can testify on **any public prayer** (not just their own board cards)
- Prayer **author's testimony always appears first**
- Testimonies have their own social actions: **like, share, save (bookmark), flag** for admin review, and **comments**
- New `moderate-testimony` edge function
- New `testimonies` table with `testimony_likes`, `testimony_flags`, `testimony_comments` tables
- `TestifyBack` component with 3D flip mechanic on `BoardCard`
- `/testify` public search page
- Admin gets a **Testimonies tab** to review flagged submissions

---

### 1. Database Migration

**New tables:**

```sql
-- Core testimonies
CREATE TABLE public.testimonies (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_id   uuid NOT NULL REFERENCES public.prayer_cards(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL,
  body        text NOT NULL CHECK (char_length(body) <= 4000),
  flagged     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Likes on testimonies
CREATE TABLE public.testimony_likes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  testimony_id  uuid NOT NULL REFERENCES public.testimonies(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(testimony_id, user_id)
);

-- Flags for admin review
CREATE TABLE public.testimony_flags (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  testimony_id  uuid NOT NULL REFERENCES public.testimonies(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL,
  reason        text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(testimony_id, user_id)
);

-- Comments on testimonies
CREATE TABLE public.testimony_comments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  testimony_id  uuid NOT NULL REFERENCES public.testimonies(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL,
  body          text NOT NULL CHECK (char_length(body) <= 500),
  created_at    timestamptz NOT NULL DEFAULT now()
);
```

**RLS policies:**
- `testimonies`: public SELECT (no flagged filter — flagged ones still show, just marked), auth INSERT (own user_id), auth DELETE (own), admin ALL
- `testimony_likes`: public SELECT, auth INSERT/DELETE (own user_id), admin ALL
- `testimony_flags`: auth INSERT (own), admin SELECT ALL
- `testimony_comments`: public SELECT, auth INSERT (own), auth DELETE (own)

---

### 2. New Edge Function — `moderate-testimony`

**File:** `supabase/functions/moderate-testimony/index.ts`

Mirrors `moderate-prayer` structure using the Lovable AI gateway. Specialized system prompt:
- APPROVE: genuine personal testimony of God answering prayer, faith journey, gratitude
- REJECT: profanity, hate speech, content that denies God answered the prayer, evil themes, off-topic
- Returns `{ approved: boolean, reason: string }`
- Fail-open (if API unavailable, defaults to approved with a flag set)

---

### 3. New Component — `TestifyBack`

**File:** `src/components/board/TestifyBack.tsx`

Props: `prayerId`, `prayerAuthorId`, `currentUserId`, `onFlipBack`

Structure:
- **Header**: "Did God answer your prayer? Testify! 🕊️"
- **Textarea**: up to 4000 chars, real-time char counter
- **Submit button**: calls `moderate-testimony` → on approved inserts to `testimonies`; on rejected shows inline error message
- **Past testimonies list** at the bottom:
  - Author's testimony always first (pinned with a subtle "Prayer Author" badge)
  - Each entry = avatar + name chip only
  - Clicking a chip expands that testimony inline with AnimatePresence
  - Expanded testimony shows: body, date, like button (with count), share button (copies URL), bookmark button (saves testimony id to a local collection), flag button (inserts into `testimony_flags`)
  - Below expanded testimony: mini comment thread (inline, collapsible)
- **Back arrow** button to flip back

---

### 4. Update `BoardCard.tsx` — 3D Flip Mechanic

**`src/components/board/BoardCard.tsx`**

Changes:
- Add `flipped` state
- Wrap the card content in a perspective container + two faces (front/back) with `backfaceVisibility: hidden`
- Add a "Testify 🕊️" button:
  - Only shown when `isPublic` (status === "approved")
  - In footer row for small/medium, in action area for large
- `<TestifyBack>` mounts as the back face — receives `prayerId`, `prayerAuthorId`, `currentUserId`, `onFlipBack`
- Animation: `motion.div` with `rotateY: 0 → 180` using spring transition

The flip wrapper replaces the outer `motion.div` — the hover lift stays on a parent wrapper.

---

### 5. New Page — `/testify`

**File:** `src/pages/Testify.tsx`

Layout:
- Hero search bar (ilike query on `testimonies.body`, joined with `prayer_cards`)
- Default view (no search): recent testimonies feed — most recent 20
- Results: testimony-first flip cards
  - **Front**: testimony excerpt (300 chars), author avatar + name, prayer title, timestamp, like/share/flag actions
  - **Back**: full prayer card text, tags, scripture (flip on "See the Prayer 🙏" button)
- Pagination: "Load more" button at bottom
- Unauthenticated users can read; must sign in to submit or interact

---

### 6. Integrate Testify into `/prayers` public feed cards

Add a small "Testify" button to `PrayerCardItem` in `src/pages/Prayers.tsx` that opens a `Sheet` or `Dialog` with the `TestifyBack` component (non-flip version, since cards aren't flip-able there). Shows testimony count badge if testimonies exist.

---

### 7. Admin Dashboard — Flagged Testimonies

Add a **Testimonies** sub-tab inside the existing Moderation tab in `src/pages/Admin.tsx`:
- Lists `testimony_flags` joined with `testimonies` and `profiles`
- Admin can view the flagged testimony, see the reporter's reason, and delete the testimony

---

### 8. App Router + SiteNav

**`src/App.tsx`**: Add `<Route path="/testify" element={<Testify />} />` (public, no auth guard)

**`src/components/SiteNav.tsx`**: Add `{ label: "Testify", href: "/testify" }` to `NAV_LINKS`

---

### Files to create/modify

| File | Action |
|---|---|
| `supabase/migrations/YYYYMMDD_testimonies.sql` | New — 4 tables + RLS |
| `supabase/functions/moderate-testimony/index.ts` | New edge function |
| `src/components/board/TestifyBack.tsx` | New component |
| `src/components/board/BoardCard.tsx` | Add flip state + Testify button + back face |
| `src/pages/Testify.tsx` | New search page |
| `src/pages/Prayers.tsx` | Add Testify button + count to public feed cards |
| `src/pages/Admin.tsx` | Add flagged testimonies sub-tab |
| `src/App.tsx` | Add `/testify` route |
| `src/components/SiteNav.tsx` | Add Testify nav link |

---

### Key UX rules enforced by implementation:
- Author's testimony always first: query orders by `(user_id = prayerAuthorId) DESC, created_at ASC`
- Testimonies visible on **public prayers only** — `TestifyBack` only mounts when `isPublic`
- Testimony like/share/save/flag all live inside the expanded chip on the back face
- Comments on a testimony are nested inside the expanded chip, collapsible
- Share testimony: copies `${origin}/testify?t=${testimonyId}`
- Flag is one-per-user (unique constraint), shows "Flagged" state after clicking
