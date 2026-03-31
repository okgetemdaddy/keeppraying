
CREATE TABLE public.bible_reading_position (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  version_id INTEGER NOT NULL,
  book_usfm TEXT NOT NULL,
  chapter_idx INTEGER NOT NULL DEFAULT 0,
  mode TEXT NOT NULL DEFAULT 'verse',
  scroll_top REAL NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bible_reading_position ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own reading position"
  ON public.bible_reading_position
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
