CREATE POLICY "Admins can update sermon transcripts"
ON public.sermon_transcripts
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::text))
WITH CHECK (has_role(auth.uid(), 'admin'::text));