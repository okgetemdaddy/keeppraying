
-- Add prayer_type to distinguish breath prayers from standard prayers
ALTER TABLE public.prayer_cards ADD COLUMN IF NOT EXISTS prayer_type text NOT NULL DEFAULT 'standard';

-- Add meditation_essay for admin-attached breath meditations
ALTER TABLE public.prayer_cards ADD COLUMN IF NOT EXISTS meditation_essay text;

-- Add meditation_link for linking to KeepGrow.ing blog post
ALTER TABLE public.prayer_cards ADD COLUMN IF NOT EXISTS meditation_link text;

-- Create breath prayer collections table
CREATE TABLE public.breath_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  prayer_ids uuid[] DEFAULT '{}'::uuid[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.breath_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own breath collections" ON public.breath_collections
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Daily breath prayer selection table (admin picks)
CREATE TABLE public.daily_breath (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_id uuid NOT NULL,
  active_date date NOT NULL UNIQUE,
  selected_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_breath ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view daily breath" ON public.daily_breath
  FOR SELECT TO public
  USING (true);

CREATE POLICY "Admins can manage daily breath" ON public.daily_breath
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));
