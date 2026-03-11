
-- Add ai_reply column to contact_submissions
ALTER TABLE public.contact_submissions
  ADD COLUMN IF NOT EXISTS ai_reply TEXT,
  ADD COLUMN IF NOT EXISTS replied_at TIMESTAMP WITH TIME ZONE;
