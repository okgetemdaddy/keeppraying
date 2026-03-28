

## Plan: AI-Powered Prayer Writing in Admin Inbox

### Overview
Add a "Generate with AI" button to the Prayer Requests Inbox expanded view. Admin types a prompt starting with "Write a powerful Christian prayer" (pre-filled), clicks Go, Grok generates the prayer, admin reviews/edits in the existing textarea, then clicks "Deliver to User's Board" which triggers the existing fulfillment flow (board delivery + notification + email trigger).

### 1. New Edge Function: `craft-prayer`
**File:** `supabase/functions/craft-prayer/index.ts`

- Accepts `{ prompt: string }` in POST body
- Validates JWT and checks admin role via service-role query on `profiles`
- Calls Grok API (`grok-4.20-0309-reasoning`) with:
  - System: "You are a compassionate prayer writer for KeepPray.ing. Write powerful, heartfelt Christian prayers that speak directly to the need described. Write in second person addressing God. No preamble — begin the prayer immediately."
  - User: the admin's prompt
- Returns `{ prayer: string }`
- Uses existing `GROK_API_KEY` secret

### 2. Update `PrayerRequestsInbox.tsx`
In the expanded pending team request section, replace the current simple textarea with a two-step flow:

- **Step A — AI Prompt:** An input/textarea pre-filled with `"Write a powerful Christian prayer "` followed by context from the user's request. A "Generate with AI" button calls the `craft-prayer` edge function.
- **Step B — Review & Edit:** The generated prayer populates the existing response textarea. Admin can freely edit. A loading spinner shows while Grok is working.
- **Deliver button** remains the same — calls existing `fulfillTeamRequest` which creates the prayer card, updates the request status to fulfilled, and triggers the existing DB trigger (`notify_prayer_request_fulfilled`) for in-app notification + board delivery.

New state variables: `aiPrompt`, `generating` (boolean).

### 3. No Database Changes
The existing `prayer_requests` table, triggers, and notification flow already handle everything. No migrations needed.

### Technical Details
- Edge function deployed with standard CORS headers
- Admin auth validated server-side by checking `profiles.role = 'admin'`
- The `grok-4.20-0309-reasoning` model (same as verse summaries) is used
- The prompt textarea auto-populates with the user's request message for context

