
-- Fix overly permissive insert policy on site_logs
-- Allow service role / edge functions to insert (they bypass RLS), 
-- and authenticated users to insert their own logs
DROP POLICY IF EXISTS "System can insert logs" ON public.site_logs;

CREATE POLICY "Authenticated users can insert logs"
  ON public.site_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL OR auth.role() = 'service_role');
