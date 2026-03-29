
CREATE TABLE public.daily_welcome_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  message text NOT NULL,
  active_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, active_date)
);

ALTER TABLE public.daily_welcome_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own welcome messages"
  ON public.daily_welcome_messages FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own welcome messages"
  ON public.daily_welcome_messages FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
