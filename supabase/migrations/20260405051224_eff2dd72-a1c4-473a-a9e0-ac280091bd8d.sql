CREATE TABLE public.enriched_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_usfm text NOT NULL,
  chapter_number int NOT NULL,
  version_id int NOT NULL,
  content_json jsonb NOT NULL,
  model_version text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (book_usfm, chapter_number, version_id)
);

ALTER TABLE public.enriched_chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read enrichments"
  ON public.enriched_chapters FOR SELECT
  TO authenticated USING (true);