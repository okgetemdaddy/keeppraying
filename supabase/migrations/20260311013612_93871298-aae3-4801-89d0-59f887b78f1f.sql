
-- Security Fix: has_role() security definer + restrict profiles UPDATE + admin_reports table

-- 1. Create has_role() security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND role = _role
  )
$$;

-- 2. Drop old permissive UPDATE policy on profiles
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- 3. New UPDATE policy that prevents role escalation
CREATE POLICY "Users can update own profile (no role escalation)" ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND
  role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
);

-- 4. Admin-only policy to update any profile including role
CREATE POLICY "Admins can update any profile" ON public.profiles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- 5. admin_reports table
CREATE TABLE IF NOT EXISTS public.admin_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  content text NOT NULL,
  report_type text NOT NULL DEFAULT 'faq',
  generated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage reports" ON public.admin_reports
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));
