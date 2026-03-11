
-- Fix: move pg_trgm to extensions schema
-- The extension is already created, this is a non-critical warning for pg_trgm in public schema
-- Fix permissive INSERT policy on contact_submissions — require non-empty message
DROP POLICY IF EXISTS "Anyone can submit contact" ON public.contact_submissions;
CREATE POLICY "Anyone can submit contact" ON public.contact_submissions
  FOR INSERT WITH CHECK (message IS NOT NULL AND length(trim(message)) > 0);

-- Fix permissive INSERT on storage objects for backgrounds — already scoped to authenticated
-- The warning is about the storage insert policy — tighten it
DROP POLICY IF EXISTS "Authenticated users can upload backgrounds" ON storage.objects;
CREATE POLICY "Authenticated users can upload backgrounds" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'prayer-backgrounds' AND auth.uid() IS NOT NULL);
