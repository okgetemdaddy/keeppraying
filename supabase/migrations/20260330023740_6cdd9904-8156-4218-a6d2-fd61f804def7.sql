
-- User activity log for tracking actions not currently logged
CREATE TABLE public.user_activity_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  activity_type text NOT NULL,
  activity_data jsonb DEFAULT '{}'::jsonb,
  page_path text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for fast lookups by user
CREATE INDEX idx_user_activity_log_user_id ON public.user_activity_log(user_id);
CREATE INDEX idx_user_activity_log_type ON public.user_activity_log(activity_type);
CREATE INDEX idx_user_activity_log_created ON public.user_activity_log(created_at DESC);

-- Enable RLS
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

-- Users can insert their own activity
CREATE POLICY "Users can insert own activity"
ON public.user_activity_log
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can view own activity
CREATE POLICY "Users can view own activity"
ON public.user_activity_log
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all activity
CREATE POLICY "Admins can view all activity"
ON public.user_activity_log
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::text));
