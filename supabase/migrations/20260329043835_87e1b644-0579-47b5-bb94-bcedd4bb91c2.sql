ALTER TABLE public.board_preferences
  ADD COLUMN IF NOT EXISTS theme_preset text DEFAULT 'golden-sunrise',
  ADD COLUMN IF NOT EXISTS theme_bg text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS theme_text text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS theme_accent text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS theme_scope text DEFAULT 'board';