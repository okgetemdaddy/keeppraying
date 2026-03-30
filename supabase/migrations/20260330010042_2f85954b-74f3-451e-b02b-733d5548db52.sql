
CREATE TABLE public.sermon_transcripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id text NOT NULL,
  video_title text,
  raw_segments jsonb,
  full_text text,
  analysis_result jsonb,
  premium_result jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT sermon_transcripts_video_id_key UNIQUE (video_id)
);

ALTER TABLE public.sermon_transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all transcripts"
  ON public.sermon_transcripts FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can insert own transcripts"
  ON public.sermon_transcripts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transcripts"
  ON public.sermon_transcripts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
