CREATE TABLE public.waitlist_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  platform text NOT NULL DEFAULT 'ipados',
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email, platform)
);
ALTER TABLE public.waitlist_signups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert waitlist" ON public.waitlist_signups FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Users see own signups" ON public.waitlist_signups FOR SELECT TO authenticated USING (auth.uid() = user_id);