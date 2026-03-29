
CREATE TABLE public.bible_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_path text UNIQUE NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bible_cache_request_path ON public.bible_cache (request_path);

ALTER TABLE public.bible_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages bible cache"
  ON public.bible_cache FOR ALL
  USING (auth.role() = 'service_role'::text);
