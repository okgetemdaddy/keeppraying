
-- Prayer Standby table: tracks users who are available to pray
CREATE TABLE public.prayer_standby (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.prayer_standby ENABLE ROW LEVEL SECURITY;

-- Users can manage their own standby status
CREATE POLICY "Users manage own standby" ON public.prayer_standby
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Anyone authenticated can view active standby users (for count)
CREATE POLICY "Authenticated can view active standby" ON public.prayer_standby
  FOR SELECT TO authenticated
  USING (is_active = true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.prayer_standby;

-- Standby responses table: quick replies from intercessors
CREATE TABLE public.standby_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prayer_id UUID NOT NULL,
  responder_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.standby_responses ENABLE ROW LEVEL SECURITY;

-- Users can insert their own responses
CREATE POLICY "Users can insert own responses" ON public.standby_responses
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = responder_id);

-- Anyone can view responses on prayers they can see
CREATE POLICY "Anyone can view responses" ON public.standby_responses
  FOR SELECT TO authenticated
  USING (true);

-- Prayer creator can view responses to their prayers
ALTER PUBLICATION supabase_realtime ADD TABLE public.standby_responses;
