

## Shared Prayer Board Restrictions + Duplicate-to-Public Guard

### Revised scope (per user clarification)

- **Copy protection is NOT needed** — users can freely copy/paste any prayer text and keep it on their private board.
- **Shared-via-secure-link prayers on recipient boards**: recipient can bookmark (save) and unbookmark only. No sharing, no deleting, no editing the prayer card.
- **Duplicate-to-public prevention**: When a user tries to make ANY prayer public (via the visibility toggle), check if a substantially similar prayer already exists in public. If yes, block it, explain why, and link to the existing public prayer. Offer a "Dispute" button that sends a message to admin.
- **No plagiarism check on private prayers** — only triggered when toggling to public.

### Changes

**1. `src/components/board/BoardCard.tsx` — Shared recipient restrictions**

- On mount, query `prayer_shares` to check if this prayer was shared to the current user (`recipient_id = userId` and `prayer_id = card.id`). Set `isSharedRecipient` flag.
- When `isSharedRecipient` is true:
  - Hide the Share2 button (public link copy)
  - Hide "Share Privately" menu item
  - Hide all owner-only controls (font, AI enrich, image upload, visibility toggle) — already gated by `isOwner`, but also hide the share button which isn't gated
  - Relabel "Remove" to "Unbookmark" — same underlying action (delete from `user_saved_prayers`)
  - Keep: favorite, pin, card size, add to playlist, open viewer

**2. `src/components/board/BoardCard.tsx` — Duplicate-to-public check in `handlePublicToggle`**

Before the moderation call (line ~271), add a similarity check:
- Call `supabase.rpc('check_prayer_similarity', { input_text: card.prayer_text })` 
- If a match is found with score > 0.55 AND the matched prayer is public (`status = 'approved'`):
  - Show a dialog/toast explaining: "A very similar prayer already exists in the community. You can view it here: [link]. If you believe this is an error, let us know and we'll get back to you ASAP."
  - Offer two actions: **"View Existing Prayer"** (link to `/prayer/{match_id}`) and **"Dispute This"** (opens dispute flow)
  - Block the public toggle
- If no match or match is private, proceed normally with moderation

**3. Database: Add `check_prayer_similarity` function**

```sql
CREATE OR REPLACE FUNCTION public.check_prayer_similarity(input_text text)
RETURNS TABLE(match_score real, match_id uuid, match_status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT similarity(prayer_text, input_text) AS match_score, 
         id AS match_id,
         status AS match_status
  FROM prayer_cards
  WHERE similarity(prayer_text, input_text) > 0.55
  ORDER BY match_score DESC
  LIMIT 1;
$$;
```

**4. Dispute flow — insert into `contact_submissions`**

When user clicks "Dispute This":
- Insert into `contact_submissions` with:
  - `name`: user's full_name
  - `email`: user's email
  - `message`: auto-generated message like "Prayer duplicate dispute: My prayer [id] was flagged as similar to [match_id]. I believe this is unique."
- Show toast: "Message sent to KeepPray.ing — we'll get back to you ASAP 🙏"
- This already appears in the admin panel's Contact Forms tab

**5. `src/components/board/BoardCard.tsx` — Duplicate block UI**

Add a small inline dialog/alert state that shows when duplicate is detected during public toggle:
- Prayer title/link to existing public prayer
- "Dispute This" button
- "Got It" dismiss button
- Styled to match the prayer card aesthetic

