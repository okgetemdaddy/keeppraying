CREATE POLICY "Admins can delete sermon transcripts"
ON public.sermon_transcripts
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::text));