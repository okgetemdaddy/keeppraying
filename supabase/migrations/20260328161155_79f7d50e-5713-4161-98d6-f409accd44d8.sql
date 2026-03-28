
CREATE TABLE public.keeppraying_sayings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text text NOT NULL,
  category text NOT NULL DEFAULT 'encouragement',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.keeppraying_sayings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sayings" ON public.keeppraying_sayings
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view active sayings" ON public.keeppraying_sayings
  FOR SELECT TO public
  USING (is_active = true);

-- Seed with default sayings
INSERT INTO public.keeppraying_sayings (text, category) VALUES
  ('God answers prayer', 'encouragement'),
  ('God is listening', 'encouragement'),
  ('He bottles every tear — Psalm 56:8', 'scripture'),
  ('Prayer works', 'encouragement'),
  ('The Lord is near to all who call on Him — Psalm 145:18', 'scripture'),
  ('Cast all your anxiety on Him, because He cares for you — 1 Peter 5:7', 'scripture'),
  ('Be still, and know that I am God — Psalm 46:10', 'scripture'),
  ('The prayer of a righteous person is powerful and effective — James 5:16', 'scripture'),
  ('Before they call I will answer — Isaiah 65:24', 'scripture'),
  ('He hears your heart', 'encouragement'),
  ('You are never praying alone', 'encouragement'),
  ('Heaven is moved by your faith', 'encouragement'),
  ('Your prayers are rising like incense — Revelation 8:4', 'scripture'),
  ('The Father sees what is done in secret — Matthew 6:6', 'scripture'),
  ('Do not be anxious about anything, but in every situation, by prayer — Philippians 4:6', 'scripture');
