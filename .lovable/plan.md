

## Upgrade Family & Circles Invite System + Full Cleanup of Old Referral Code

### Overview
Remove the old invite code system (plain hex codes like `a3f2b1c9e4d7`) from Family Rooms and Circles, and replace it with a secure magic link invite system with branded landing pages.

---

### Step 1: Database Migration

Create `invite_tokens` table and update RLS:

```sql
CREATE TABLE public.invite_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('family', 'circle')),
  target_id uuid NOT NULL,
  token text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(16), 'hex'),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  used boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invite_tokens ENABLE ROW LEVEL SECURITY;

-- Creators can manage their tokens
CREATE POLICY "Creators can manage own tokens"
  ON invite_tokens FOR ALL TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Anyone (including unauthenticated) can look up a token to view the landing page
CREATE POLICY "Anyone can read valid tokens"
  ON invite_tokens FOR SELECT TO public
  USING (used = false AND expires_at > now());
```

The old `invite_code` columns on `family_rooms`, `accountability_circles`, and `prayer_groups` remain in the DB (no column drop — avoids breaking anything) but all UI references are removed.

---

### Step 2: Full Cleanup of Old Invite Code UI

**Files to edit:**

| File | What to remove |
|------|---------------|
| `src/pages/FamilyRoomDetail.tsx` | Remove `copyCode()`, the "Family Code" button (line 262-265), old flyer dialog showing `room.invite_code` (lines 555-575), `copied` state |
| `src/pages/FamilyRooms.tsx` | Remove "Join with Family Code" button & join dialog (lines 85-88, 162-180), `joinByCode` usage |
| `src/pages/CircleDetail.tsx` | Remove `copyInvite()`, share invite dialog showing code (lines 527-545), flyer dialog showing invite code (lines 708-739), leave dialog mentioning "invite code" |
| `src/pages/AccountabilityCircles.tsx` | Remove "Join with Code" button & join dialog (lines 127-129, 262-283), `inviteCode` state, `handleJoin` |
| `src/hooks/useFamilyRooms.ts` | Remove `invite_code` from `FamilyRoom` interface, remove `joinByCode` function |
| `src/hooks/useAccountabilityCircles.ts` | Remove `invite_code` from `Circle` interface |
| `src/App.tsx` | Update feature description "Share an invite code" → "Share a magic invite link" (line 144) |

---

### Step 3: New Invite Link Generation + Share Modal

**New component: `src/components/InviteShareModal.tsx`**

A reusable modal for both Family Rooms and Circles that:
- On open, generates a new `invite_tokens` row via Supabase insert
- Displays the magic link: `https://keeppraying.lovable.app/invite/family/{token}` or `/invite/circle/{token}`
- Share options: Copy Link button, Email (mailto:), SMS/WhatsApp (sms: / https://wa.me), QR Code (generated client-side via a lightweight QR library or canvas-based generation)
- Shows expiration (7 days) with option to regenerate
- Styled consistently with the sacred prayer closet aesthetic

**Integration points:**
- `FamilyRoomDetail.tsx`: Replace "Family Code" button → "Invite Members" button that opens `InviteShareModal` with `type="family"` and `targetId={room.id}`
- `CircleDetail.tsx`: Replace share invite dialog → "Invite Members" button opening `InviteShareModal` with `type="circle"` and `targetId={circle.id}`
- Update flyer dialogs to show the magic link instead of old codes

---

### Step 4: Public Invite Landing Page

**New page: `src/pages/InviteLanding.tsx`**

Route: `/invite/:type/:token`

This page is publicly accessible (no AuthGate). It:
1. Fetches the token from `invite_tokens` (public SELECT policy allows this)
2. Looks up the target name: queries `family_rooms` or `accountability_circles` by `target_id` (these tables have public SELECT policies already)
3. Shows a beautiful branded page with:
   - KeepPray.ing branding with golden gradient header
   - The room/circle name and description
   - A welcoming message ("You've been invited to join...")
   - Key features of KeepPray.ing (3-4 cards)
   - Scripture verse
   - Prominent "Join [Name]" CTA button
4. If user is logged in → clicking Join: validates token, inserts member row, marks token used, redirects to `/family/{id}` or `/circles/{id}`
5. If user is not logged in → redirects to `/auth` with return URL stored, then auto-joins after authentication

**Route addition in `App.tsx`:**
```tsx
<Route path="/invite/:type/:token" element={<InviteLanding />} />
```

---

### Step 5: Join Logic (Edge Function or Client-Side)

Client-side join flow in `InviteLanding.tsx`:
1. Validate token exists and is not expired/used
2. Insert membership row into `family_room_members` or `accountability_circle_members`
3. Mark token as used (update `invite_tokens SET used = true`)
4. Redirect to the room/circle
5. Show welcome toast

For the "used" update, we need an UPDATE policy:
```sql
CREATE POLICY "Anyone authenticated can mark tokens used"
  ON invite_tokens FOR UPDATE TO authenticated
  USING (used = false AND expires_at > now())
  WITH CHECK (used = true);
```

---

### Step 6: QR Code Generation

Use a simple canvas-based QR code generator (no external dependency needed — can use a small inline QR generation utility or add `qrcode` package). Display the QR in the share modal for easy in-person sharing.

---

### Summary of All Files Changed/Created

| Action | File |
|--------|------|
| Create | `supabase/migrations/[timestamp].sql` (invite_tokens table + RLS) |
| Create | `src/components/InviteShareModal.tsx` |
| Create | `src/pages/InviteLanding.tsx` |
| Edit | `src/App.tsx` (add route, update feature text) |
| Edit | `src/pages/FamilyRoomDetail.tsx` (remove old code UI, add invite button) |
| Edit | `src/pages/FamilyRooms.tsx` (remove join-by-code flow) |
| Edit | `src/pages/CircleDetail.tsx` (remove old code UI, add invite button) |
| Edit | `src/pages/AccountabilityCircles.tsx` (remove join-by-code flow) |
| Edit | `src/hooks/useFamilyRooms.ts` (remove invite_code, joinByCode) |
| Edit | `src/hooks/useAccountabilityCircles.ts` (remove invite_code from interface) |

