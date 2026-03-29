
CREATE POLICY "Admins can manage all welcome messages"
  ON public.daily_welcome_messages FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::text))
  WITH CHECK (has_role(auth.uid(), 'admin'::text));
