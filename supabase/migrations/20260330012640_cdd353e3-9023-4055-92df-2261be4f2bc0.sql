CREATE TABLE public.user_sermon_progress (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  completed_points jsonb NOT NULL DEFAULT '{}',
  notif_times jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_sermon_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own progress" ON public.user_sermon_progress
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());