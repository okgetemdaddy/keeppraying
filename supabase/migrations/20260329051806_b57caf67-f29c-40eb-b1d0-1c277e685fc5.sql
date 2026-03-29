ALTER TABLE public.board_preferences
  ADD COLUMN IF NOT EXISTS atmosphere_id text DEFAULT 'warm-parchment';