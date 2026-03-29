
-- Add answered_date to testimonies
ALTER TABLE public.testimonies ADD COLUMN IF NOT EXISTS answered_date date DEFAULT NULL;

-- Create testimony_updates table for faith journey tracking
CREATE TABLE public.testimony_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  testimony_id uuid NOT NULL REFERENCES public.testimonies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.testimony_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own testimony updates" ON public.testimony_updates
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone can view testimony updates" ON public.testimony_updates
  FOR SELECT TO authenticated
  USING (true);
