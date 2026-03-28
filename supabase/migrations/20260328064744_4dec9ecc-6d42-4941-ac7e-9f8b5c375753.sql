
-- Classical Prayers table for admin-uploaded prayers from church fathers
CREATE TABLE public.classical_prayers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  author_era TEXT,
  prayer_text TEXT NOT NULL,
  extended_text TEXT,
  labels TEXT[] DEFAULT '{}'::TEXT[],
  source_reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.classical_prayers ENABLE ROW LEVEL SECURITY;

-- Anyone can read
CREATE POLICY "Anyone can view classical prayers"
  ON public.classical_prayers FOR SELECT
  TO public
  USING (true);

-- Only admins can manage
CREATE POLICY "Admins can manage classical prayers"
  ON public.classical_prayers FOR ALL
  TO public
  USING (has_role(auth.uid(), 'admin'::text));

-- Updated_at trigger
CREATE TRIGGER update_classical_prayers_updated_at
  BEFORE UPDATE ON public.classical_prayers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
