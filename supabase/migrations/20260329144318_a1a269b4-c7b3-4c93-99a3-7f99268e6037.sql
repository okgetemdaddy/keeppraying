
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

CREATE POLICY "Creators can manage own tokens"
  ON invite_tokens FOR ALL TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Anyone can read valid tokens"
  ON invite_tokens FOR SELECT TO public
  USING (used = false AND expires_at > now());

CREATE POLICY "Anyone authenticated can mark tokens used"
  ON invite_tokens FOR UPDATE TO authenticated
  USING (used = false AND expires_at > now())
  WITH CHECK (used = true);
