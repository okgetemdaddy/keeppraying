
CREATE POLICY "Admin select tokens" ON public.upload_access_tokens
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin insert tokens" ON public.upload_access_tokens
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
