
ALTER TABLE public.library_chunks 
  ADD COLUMN IF NOT EXISTS bible_book_usfm text,
  ADD COLUMN IF NOT EXISTS chapter_number integer,
  ADD COLUMN IF NOT EXISTS source_url text;

CREATE INDEX IF NOT EXISTS idx_library_chunks_chapter 
  ON public.library_chunks (bible_book_usfm, chapter_number);

ALTER TABLE public.bible_sight_entries 
  ADD COLUMN IF NOT EXISTS chat_log jsonb;
