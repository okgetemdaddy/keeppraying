
CREATE TABLE public.verse_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference TEXT NOT NULL,
  verse_text TEXT,
  summary TEXT,
  exegesis TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT verse_summaries_reference_unique UNIQUE (reference)
);

ALTER TABLE public.verse_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view verse summaries"
  ON public.verse_summaries FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage verse summaries"
  ON public.verse_summaries FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Admins can manage verse summaries"
  ON public.verse_summaries FOR ALL
  USING (has_role(auth.uid(), 'admin'::text));

CREATE INDEX idx_verse_summaries_reference ON public.verse_summaries(reference);
CREATE INDEX idx_verse_summaries_fts ON public.verse_summaries USING GIN(to_tsvector('english', reference || ' ' || COALESCE(summary, '') || ' ' || COALESCE(exegesis, '')));

CREATE TRIGGER update_verse_summaries_updated_at
  BEFORE UPDATE ON public.verse_summaries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
