CREATE POLICY "Anon can read shared prayers"
  ON public.prayer_cards FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.prayer_shares ps
      WHERE ps.prayer_id = prayer_cards.id
        AND ps.expires_at > now()
    )
  );