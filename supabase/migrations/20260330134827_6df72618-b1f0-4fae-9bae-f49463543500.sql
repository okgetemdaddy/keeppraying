CREATE POLICY "Authenticated can read prayers shared with them"
  ON public.prayer_cards FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.prayer_shares ps
      WHERE ps.prayer_id = prayer_cards.id
        AND ps.expires_at > now()
        AND (
          ps.recipient_id = auth.uid()
          OR ps.recipient_id IS NULL
        )
    )
  );