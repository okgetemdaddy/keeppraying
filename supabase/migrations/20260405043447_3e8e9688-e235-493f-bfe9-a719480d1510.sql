
-- Bible Sight entries table for AI-generated journal content
CREATE TABLE public.bible_sight_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_usfm TEXT NOT NULL,
  chapter_number INTEGER NOT NULL,
  version_id INTEGER NOT NULL DEFAULT 1,
  content TEXT NOT NULL,
  lens_used TEXT NOT NULL,
  model_used TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  summary_line TEXT,
  is_refresh BOOLEAN NOT NULL DEFAULT false,
  parent_entry_id UUID REFERENCES public.bible_sight_entries(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for user lookups
CREATE INDEX idx_bible_sight_entries_user ON public.bible_sight_entries(user_id);
-- Index for admin search by tags
CREATE INDEX idx_bible_sight_entries_tags ON public.bible_sight_entries USING GIN(tags);
-- Index for chapter lookups
CREATE INDEX idx_bible_sight_entries_chapter ON public.bible_sight_entries(book_usfm, chapter_number);

-- Enable RLS
ALTER TABLE public.bible_sight_entries ENABLE ROW LEVEL SECURITY;

-- Users can view their own entries
CREATE POLICY "Users can view own bible sight entries"
  ON public.bible_sight_entries FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can delete their own entries
CREATE POLICY "Users can delete own bible sight entries"
  ON public.bible_sight_entries FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Service role inserts (edge function)
CREATE POLICY "Service role can insert bible sight entries"
  ON public.bible_sight_entries FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admin can view all entries
CREATE POLICY "Admins can view all bible sight entries"
  ON public.bible_sight_entries FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
