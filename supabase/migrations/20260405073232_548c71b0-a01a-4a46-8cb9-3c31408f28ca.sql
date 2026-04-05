
CREATE TABLE public.commentary_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author text NOT NULL,
  book_usfm text NOT NULL,
  chapter_number integer NOT NULL,
  chunk_id uuid REFERENCES public.library_chunks(id) ON DELETE SET NULL,
  excerpt text NOT NULL,
  title text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.commentary_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own bookmarks"
  ON public.commentary_bookmarks FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
