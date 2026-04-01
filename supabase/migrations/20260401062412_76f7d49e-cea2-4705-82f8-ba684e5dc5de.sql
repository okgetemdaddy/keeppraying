
CREATE TABLE public.trash_bin (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_type text NOT NULL,
  item_id text NOT NULL,
  item_snapshot jsonb NOT NULL,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days')
);

ALTER TABLE public.trash_bin ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own trash"
  ON public.trash_bin FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_trash_bin_user ON public.trash_bin(user_id, deleted_at DESC);
