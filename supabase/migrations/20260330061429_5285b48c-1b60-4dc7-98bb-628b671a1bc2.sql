
CREATE TABLE public.user_churches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  website_url text,
  address text,
  phone text,
  email text,
  scraped_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE public.user_churches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own church" ON public.user_churches FOR ALL
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.church_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  church_id uuid NOT NULL REFERENCES public.user_churches(id) ON DELETE CASCADE,
  video_id text NOT NULL,
  video_title text,
  announcement_text text NOT NULL,
  timestamp_seconds integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.church_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own announcements" ON public.church_announcements FOR ALL
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
