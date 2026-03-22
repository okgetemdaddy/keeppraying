
## Full Implementation Plan

### Issue 1: Arrow not appearing

**Root cause**: `VerseLinkIntro` fires on mount (setTimeout 1800ms) but also reads `localStorage` flag — once the previous implementation ran, `verselink_intro_seen = "1"` is set permanently so the arrow never shows again for the same browser session.

**Fix**: Replace mount-timeout with `useInView` from Framer Motion. The component watches for when the Lord's Prayer section scrolls into view. The draw animation delay of 1.5s simulates "reading time". Remove the localStorage block entirely — the animation is tied to scroll position and `viewport={{ once: true }}` handles the "only once per session" behavior cleanly.

### Issue 2: Prayer creation flow redesign

**Database migration needed:**
1. Alter `prayer_cards` status constraint to allow `'private'`
2. Add RLS: owner can SELECT their own prayers at any status
3. Broaden UPDATE policy to cover `private` status too

**`AddPrayerModal.tsx` changes:**
- Remove all moderation logic on creation (no more `moderate-prayer` call)
- Save with `status: 'private'`, `source: 'community'`
- After insert, auto-insert into `user_saved_prayers` so it appears on board immediately
- Toast: "Prayer saved to your board 🙏" with "View Board" action
- Remove "submitted for review" copy throughout

**`Board.tsx` — `SortableCard` changes:**
- Add `Public/Private` toggle Switch (from `@/components/ui/switch`)
- When toggled ON: run moderation → if approved set `status: 'pending'`, if rejected stay private
- When toggled OFF: set `status: 'private'`  
- Only show toggle on cards where `card.created_by === user.id`
- Add AI Enrich button that opens an `AIEnrichPanel`

**New `src/components/AIEnrichPanel.tsx`:**
- Sheet component sliding from right
- Calls `enrich-prayer` edge function with `prayer_text` + `extended_prayer`
- Shows AI-suggested tags (checkboxes) and scripture verses (checkboxes rendered as VerseLinks)
- "Apply Selected" updates the `prayer_cards` record and refreshes the board card

**New `supabase/functions/enrich-prayer/index.ts`:**
- Takes `prayer_text`, `extended_prayer`
- Uses tool calling with Gemini to return `{ tags: string[], verses: { ref: string, text: string }[] }`
- Returns structured JSON

**Board `fetchSaved` query change:**
- Must now also fetch cards where `created_by = user.id` AND `status = 'private'` — these won't appear via the join currently because only approved cards are RLS-readable. With the new SELECT policy for owners, the join will work automatically.

### Files changed

| File | Change |
|---|---|
| `supabase/migrations/new` | Add `private` to status constraint; owner SELECT policy; broaden UPDATE policy |
| `src/pages/Index.tsx` | Replace `VerseLinkIntro` mount-timeout with `useInView` scroll trigger |
| `src/components/AddPrayerModal.tsx` | Strip moderation on create; save as `private`; auto-add to board; new toast CTA |
| `src/pages/Board.tsx` | Add Public/Private switch + AI Enrich button to `SortableCard`; pass `user` and `onRefresh` props |
| `src/components/AIEnrichPanel.tsx` (new) | Sheet: shows AI tag/verse suggestions with checkboxes; applies selected to card |
| `supabase/functions/enrich-prayer/index.ts` (new) | Edge function: returns structured tag + verse suggestions via Gemini tool calling |

### Clean-up (as requested)
- Remove dead `moderating` state and `setModerating` calls from `AddPrayerModal` after stripping moderation
- Remove `FAITH_KEYWORDS`/`extractTags` from `AddPrayerModal` (AI enrichment replaces it — tags will be applied post-creation via `AIEnrichPanel`)
- Remove `SUPABASE_URL` const from `AddPrayerModal` (no more direct fetch calls)
- Remove `[seen]` dep array pattern from `VerseLinkIntro` since localStorage is no longer used
