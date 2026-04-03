
-- Study artifacts table for saved annotated chapter snapshots
CREATE TABLE public.study_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  book_usfm text NOT NULL,
  chapter_number int NOT NULL,
  version_id int NOT NULL,
  title text NOT NULL,
  image_url text NOT NULL,
  stroke_count int NOT NULL DEFAULT 0,
  card_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.study_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own study artifacts"
  ON public.study_artifacts FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Storage bucket for exported study images
INSERT INTO storage.buckets (id, name, public)
VALUES ('study-exports', 'study-exports', true);

-- Allow authenticated users to upload to study-exports
CREATE POLICY "Authenticated users can upload study exports"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'study-exports');

-- Allow public read access to study exports
CREATE POLICY "Public read access for study exports"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'study-exports');

-- Allow users to delete their own study exports
CREATE POLICY "Users can delete own study exports"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'study-exports' AND (storage.foldername(name))[1] = auth.uid()::text);
