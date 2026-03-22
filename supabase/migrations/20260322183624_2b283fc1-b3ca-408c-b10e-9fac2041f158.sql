
-- Add spatial/size columns to user_saved_prayers for board layout
ALTER TABLE public.user_saved_prayers
  ADD COLUMN IF NOT EXISTS card_size text NOT NULL DEFAULT 'medium' CHECK (card_size IN ('small','medium','large')),
  ADD COLUMN IF NOT EXISTS grid_position integer NOT NULL DEFAULT 0;

-- Board user preferences table
CREATE TABLE IF NOT EXISTS public.board_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  theme text NOT NULL DEFAULT 'golden-sunrise',
  animations_enabled boolean NOT NULL DEFAULT true,
  sound_id text,
  sound_volume real NOT NULL DEFAULT 0.4,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.board_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own board preferences"
  ON public.board_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_board_preferences_updated_at
  BEFORE UPDATE ON public.board_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
