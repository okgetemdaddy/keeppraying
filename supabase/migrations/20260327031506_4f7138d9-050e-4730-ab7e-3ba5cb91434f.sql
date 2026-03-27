ALTER TABLE public.prayer_cards ADD COLUMN IF NOT EXISTS region text DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_prayer_cards_region ON public.prayer_cards(region);
CREATE INDEX IF NOT EXISTS idx_prayed_actions_created_at ON public.prayed_actions(created_at);