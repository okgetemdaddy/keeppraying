ALTER TABLE public.prayer_cards
  ADD COLUMN card_opacity real DEFAULT 1.0,
  ADD COLUMN card_color jsonb DEFAULT NULL;