
-- Create library_toc table for deterministic IVP Commentary lookup
CREATE TABLE public.library_toc (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_title TEXT NOT NULL,
  author TEXT,
  bible_book_usfm TEXT NOT NULL,
  chapter_start INTEGER NOT NULL,
  chapter_end INTEGER NOT NULL,
  section_title TEXT,
  content_summary TEXT,
  page_reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast chapter lookup
CREATE INDEX idx_library_toc_usfm_chapter ON public.library_toc (bible_book_usfm, chapter_start, chapter_end);

-- RLS: publicly readable (used by edge functions with service role anyway)
ALTER TABLE public.library_toc ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Library TOC is publicly readable"
  ON public.library_toc FOR SELECT
  USING (true);

CREATE POLICY "Only admins can modify library TOC"
  ON public.library_toc FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add secondary_json column to enriched_chapters for dual-model caching
ALTER TABLE public.enriched_chapters
  ADD COLUMN IF NOT EXISTS secondary_json JSONB;
