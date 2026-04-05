CREATE TABLE public.fruit_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_used text NOT NULL,
  report_content text NOT NULL,
  chat_log jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fruit_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own reports"
  ON public.fruit_reports FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());