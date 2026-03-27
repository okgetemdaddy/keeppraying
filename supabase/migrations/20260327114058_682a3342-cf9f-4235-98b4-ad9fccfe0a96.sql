ALTER TABLE public.prayer_cards ADD COLUMN IF NOT EXISTS audio_url text DEFAULT NULL;

INSERT INTO storage.buckets (id, name, public) VALUES ('prayer-audio', 'prayer-audio', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can read prayer audio" ON storage.objects FOR SELECT USING (bucket_id = 'prayer-audio');
CREATE POLICY "Authenticated users can upload prayer audio" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'prayer-audio' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own prayer audio" ON storage.objects FOR UPDATE USING (bucket_id = 'prayer-audio' AND auth.uid() IS NOT NULL);