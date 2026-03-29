
-- =============================================
-- Phase 1: Bible Interaction Schema
-- =============================================

-- 1. user_highlights
CREATE TABLE public.user_highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version_id integer NOT NULL,
  book_usfm text NOT NULL,
  chapter_number integer NOT NULL,
  verse_number integer NOT NULL,
  color text NOT NULL DEFAULT 'yellow',
  reference_normalized jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_highlights ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_user_highlights_chapter_lookup
  ON public.user_highlights (user_id, version_id, book_usfm, chapter_number);

CREATE POLICY "Users select own highlights" ON public.user_highlights FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own highlights" ON public.user_highlights FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own highlights" ON public.user_highlights FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own highlights" ON public.user_highlights FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 2. user_notes
CREATE TABLE public.user_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version_id integer NOT NULL,
  book_usfm text NOT NULL,
  chapter_number integer NOT NULL,
  verse_number integer NOT NULL,
  note_content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_user_notes_chapter_lookup
  ON public.user_notes (user_id, version_id, book_usfm, chapter_number);

CREATE POLICY "Users select own notes" ON public.user_notes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own notes" ON public.user_notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own notes" ON public.user_notes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own notes" ON public.user_notes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER set_user_notes_updated_at BEFORE UPDATE ON public.user_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. user_bookmarks
CREATE TABLE public.user_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version_id integer NOT NULL,
  book_usfm text NOT NULL,
  chapter_number integer NOT NULL,
  verse_number integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, version_id, book_usfm, chapter_number, verse_number)
);

ALTER TABLE public.user_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_user_bookmarks_chapter_lookup
  ON public.user_bookmarks (user_id, version_id, book_usfm, chapter_number);

CREATE POLICY "Users select own bookmarks" ON public.user_bookmarks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own bookmarks" ON public.user_bookmarks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own bookmarks" ON public.user_bookmarks FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own bookmarks" ON public.user_bookmarks FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 4. verse_bunches
CREATE TABLE public.verse_bunches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bunch_name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.verse_bunches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own bunches" ON public.verse_bunches FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own bunches" ON public.verse_bunches FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own bunches" ON public.verse_bunches FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own bunches" ON public.verse_bunches FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER set_verse_bunches_updated_at BEFORE UPDATE ON public.verse_bunches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. verse_bunch_items
CREATE TABLE public.verse_bunch_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bunch_id uuid NOT NULL REFERENCES public.verse_bunches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version_id integer NOT NULL,
  book_usfm text NOT NULL,
  chapter_number integer NOT NULL,
  verse_number integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bunch_id, version_id, book_usfm, chapter_number, verse_number)
);

ALTER TABLE public.verse_bunch_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_verse_bunch_items_chapter_lookup
  ON public.verse_bunch_items (user_id, version_id, book_usfm, chapter_number);

CREATE POLICY "Users select own bunch items" ON public.verse_bunch_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own bunch items" ON public.verse_bunch_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own bunch items" ON public.verse_bunch_items FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own bunch items" ON public.verse_bunch_items FOR DELETE TO authenticated USING (auth.uid() = user_id);
