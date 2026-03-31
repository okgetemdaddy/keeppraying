-- Add new site-settings columns to board_preferences
ALTER TABLE public.board_preferences
  ADD COLUMN IF NOT EXISTS caption_mode_tts boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS caption_mode_recorded boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS default_card_layout text NOT NULL DEFAULT 'standard';

-- Add voice_audio_url to prayer_cards
ALTER TABLE public.prayer_cards
  ADD COLUMN IF NOT EXISTS voice_audio_url text;