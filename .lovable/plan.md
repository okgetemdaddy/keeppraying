

## Private Prayer Sharing System

### Overview
Enable users to share a private prayer with another platform user via two paths: (1) in-app user search → one-click share → notification, and (2) generate a secure link for SMS/text sharing with a branded landing page for unauthenticated recipients.

### Database Changes

**New table: `prayer_shares`**
```sql
CREATE TABLE public.prayer_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  recipient_id uuid,              -- null when shared via link before claim
  token text NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  message text,                    -- optional personal note
  status text NOT NULL DEFAULT 'pending',  -- pending | viewed | saved
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '30 days',
  UNIQUE(token)
);

ALTER TABLE public.prayer_shares ENABLE ROW LEVEL SECURITY;

-- Sender can do everything with their shares
CREATE POLICY "Senders manage own shares"
  ON public.prayer_shares FOR ALL TO authenticated
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

-- Recipients can view shares sent to them
CREATE POLICY "Recipients can view their shares"
  ON public.prayer_shares FOR SELECT TO authenticated
  USING (auth.uid() = recipient_id);

-- Recipients can update status (mark viewed/saved)
CREATE POLICY "Recipients can update share status"
  ON public.prayer_shares FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id);

-- Anyone can read by valid token (for landing page before auth)
CREATE POLICY "Anyone can read by valid token"
  ON public.prayer_shares FOR SELECT TO public
  USING (expires_at > now());
```

**New table: `prayer_share_comments`** (private thread between sender and recipient only)
```sql
CREATE TABLE public.prayer_share_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id uuid NOT NULL REFERENCES prayer_shares(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prayer_share_comments ENABLE ROW LEVEL SECURITY;

-- Only