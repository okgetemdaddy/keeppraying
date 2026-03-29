ALTER TABLE public.board_preferences
  ADD COLUMN IF NOT EXISTS calendar_bg text DEFAULT '#F5F0E8',
  ADD COLUMN IF NOT EXISTS calendar_text text DEFAULT '#2C2418',
  ADD COLUMN IF NOT EXISTS calendar_accent text DEFAULT '#B85C38';