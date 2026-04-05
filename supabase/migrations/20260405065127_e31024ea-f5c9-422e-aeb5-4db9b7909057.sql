ALTER TABLE public.bible_sight_entries
  ADD COLUMN IF NOT EXISTS entry_type text NOT NULL DEFAULT 'journal',
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS session_data jsonb;