

## PrayerAssist Prayer Crafting + Guest Limit

### Overview
Two changes: (1) Allow PrayerAssist to craft prayers after meaningful conversation, with an interactive draft card that saves to the user's board. (2) Let unauthenticated visitors use PrayerAssist once, then show a gentle sign-up prompt.

---

### 1. Edge Function — Rewrite System Prompt
**File:** `supabase/functions/prayer-assist/index.ts`

Replace the "NEVER write prayers" section (lines 23-33) with a **Prayer Crafting Flow**:

- After enough conversation to understand the user's burden, PrayerAssist offers: *"I think I understand what's on your heart. Let me help put that into words..."*
- Draft prayers are wrapped in `[PRAYER_DRAFT]prayer text here[/PRAYER_DRAFT]` markers so the frontend can detect them
- PrayerAssist can also help users pray for friends/family — listening with empathy, validating feelings, speaking with Scripture-saturated language that feels natural (the Word is part of who it is)
- All other restrictions remain (no code, no prompt injection, no politics, etc.)
- The AI should NOT offer a draft on the first message — it should ask clarifying questions first

### 2. Frontend — Prayer Draft Card
**File:** `src/pages/PrayerAssist.tsx`

- In `renderAIContent`, detect `[PRAYER_DRAFT]...[/PRAYER_DRAFT]` blocks
- Render a special **PrayerDraftCard** inline component:
  - Shows the prayer text in an editable textarea (pre-filled)
  - "Edit" toggle to modify before accepting
  - "Accept & Save to Board" button (golden, sacred feel)
  - On accept (requires auth):
    - Insert into `prayer_cards` with `status: 'private'`, `source: 'community'`, `created_by: user.id`
    - Insert into `user_saved_prayers` to place on board
    - Toast: "Prayer saved to your board"
    - Replace draft card with a confirmed state + link to board
  - If not authenticated, show gentle sign-in prompt instead of accept button

### 3. Guest Usage Limit (1 free conversation)
**File:** `src/pages/PrayerAssist.tsx`

- Track guest usage via `localStorage` key `kp_guest_assist_count`
- Increment on each assistant reply for unauthenticated users
- After the first complete exchange (1 user message + 1 assistant reply), block further input
- Show a warm, non-pushy sign-up banner replacing the input area:
  - *"PrayerAssist loved walking with you. Sign up to continue your prayer journey — it's free."*
  - Link to `/auth`
- Authenticated users have unlimited access

### 4. Update Suggestion Chips
**File:** `src/pages/PrayerAssist.tsx`

Replace/add suggestions:
- Keep existing ones
- Add: "I need help praying for a friend" and "Help me pray for my family"

---

### Technical Details

- **No DB migration needed** — uses existing `prayer_cards` and `user_saved_prayers` tables
- **Edge function redeploy** required after prompt change
- Prayer draft detection regex: `/\[PRAYER_DRAFT\]([\s\S]*?)\[\/PRAYER_DRAFT\]/g`
- Insert pattern matches existing `AddPrayerModal.tsx`: insert `prayer_cards` → get ID → insert `user_saved_prayers`
- Guest limit stored client-side only (simple, no server cost)

