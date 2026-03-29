

# Revised Testify Cards — Two-in-One Flip Card System

**Change from previous plan**: Remove the heart/like button entirely from testimony cards. The Praise Hands 🙌 button becomes the sole social action. When a user clicks Praise Hands on a public testimony on `/testify`, show a dialog asking "Save this testimony to your prayer board?" — combining the praise action with the optional save.

---

## 1. Database Migration

Add columns to `testimonies`:
```sql
ALTER TABLE public.testimonies
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS verses jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS praise_count integer NOT NULL DEFAULT 0;
```

Create `testimony_praises` table (replaces the role of `testimony_likes`):
```sql
CREATE TABLE public.testimony_praises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  testimony_id uuid NOT NULL REFERENCES testimonies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(testimony_id, user_id)
);
ALTER TABLE public.testimony_praises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view praises" ON public.testimony_praises FOR SELECT USING (true);
CREATE POLICY "Auth users insert own praises" ON public.testimony_praises FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Auth users delete own praises" ON public.testimony_praises FOR DELETE USING (auth.uid() = user_id);
```

Auto-increment trigger for `praise_count` on insert/delete.

Create `user_saved_testimonies` table:
```sql
CREATE TABLE public.user_saved_testimonies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  testimony_id uuid NOT NULL REFERENCES testimonies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, testimony_id)
);
ALTER TABLE public.user_saved_testimonies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own saved testimonies" ON public.user_saved_testimonies
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

---

## 2. Edge Function: `enrich-testimony`

New `supabase/functions/enrich-testimony/index.ts` — calls Lovable AI (`google/gemini-3-flash-preview`) to generate a title and suggest 3-5 Bible verses for a testimony body. Returns structured JSON.

---

## 3. AI Enrichment Modal

New `src/components/board/TestimonyEnrichModal.tsx`:
- Opens after user writes testimony and clicks "Share Testimony"
- Shows AI-generated title (editable) + suggested verses (individually removable)
- Private/Public toggle
- On confirm: inserts testimony with title, verses, is_public

---

## 4. Refactor TestifyBack

Modify `src/components/board/TestifyBack.tsx`:
- After writing testimony body and clicking share, open `TestimonyEnrichModal` instead of direct insert
- **Remove all `testimony_likes` references** — no more heart button
- Replace heart with Praise Hands 🙌 on the testimony list within the card

---

## 5. Two-in-One Flip Card on Board

Modify `src/components/board/BoardCard.tsx`:
- Query if a testimony exists for the prayer card (for current user)
- If yes, card becomes two-sided: Front = prayer, Back = testimony
- Existing "Testify" button becomes "See Testimony" to flip
- Back side has "See Prayer" to flip back

---

## 6. Testimony Card Face Component

New `src/components/board/TestimonyCardFace.tsx`:
- Renders title, body, verses, Praise Hands 🙌 with count
- "See Prayer" flip button
- Same 2.5D glassmorphism depth as prayer front

---

## 7. Praise Hands 🙌 (Replaces Hearts Everywhere)

- **On board**: 🙌 button with count, gentle scale animation, insert/delete from `testimony_praises`
- **On `/testify` page**: When user clicks 🙌 on a public testimony:
  - If not yet praised → show dialog: "Save this testimony to your prayer board?"
  - Yes → insert into `testimony_praises` + `user_saved_testimonies`, toast
  - No → insert into `testimony_praises` only, praise count increments
  - If already praised → un-praise (delete from `testimony_praises`, also remove from `user_saved_testimonies` if saved)
- **Remove all heart/like buttons and `testimony_likes` usage** from `Testify.tsx` and `TestifyBack.tsx`

---

## 8. Flip Cards on `/testify` Page

Modify `src/pages/Testify.tsx`:
- Remove all `testimony_likes` queries and heart UI
- Replace with Praise Hands 🙌 + save dialog flow
- If testimony has a linked prayer, render as two-sided flip card (testimony front by default, "See Prayer" to flip)

---

## 9. Testimony Detail Page

New `src/pages/TestimonyDetail.tsx` at `/testimony/:id`:
- Full testimony with title, body, verses, praise button, comments
- Dynamic page title: `{title} | KeepPray.ing`
- Link to original prayer if exists

Add route in `src/App.tsx`.

---

## 10. Enrich Existing Testimonies

One-time: call `enrich-testimony` for the 2 existing testimonies, update their `title` and `verses`.

---

## 11. Update Share Links

Change testimony share URLs from `/testify?t=ID` to `/testimony/ID`.

---

## File Changes Summary

| File | Action |
|------|--------|
| Database migration | Add columns + 2 new tables + trigger |
| `supabase/functions/enrich-testimony/index.ts` | Create |
| `src/components/board/TestimonyEnrichModal.tsx` | Create |
| `src/components/board/TestimonyCardFace.tsx` | Create |
| `src/pages/TestimonyDetail.tsx` | Create |
| `src/App.tsx` | Add `/testimony/:id` route |
| `src/components/board/TestifyBack.tsx` | Refactor: use enrich modal, remove hearts, add praise hands |
| `src/components/board/BoardCard.tsx` | Two-sided flip when testimony exists |
| `src/pages/Testify.tsx` | Remove hearts, add praise hands + save dialog, flip cards |

