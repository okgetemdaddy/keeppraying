
-- Prayer requests table for both community and team requests
CREATE TABLE public.prayer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  request_type text NOT NULL DEFAULT 'community' CHECK (request_type IN ('community', 'team')),
  message text NOT NULL,
  is_urgent boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'fulfilled', 'closed')),
  assigned_prayer_id uuid REFERENCES public.prayer_cards(id),
  admin_response text,
  escalation_batch integer NOT NULL DEFAULT 0,
  last_escalated_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for admin inbox
CREATE INDEX idx_prayer_requests_type_status ON public.prayer_requests(request_type, status);
CREATE INDEX idx_prayer_requests_requester ON public.prayer_requests(requester_id);

-- RLS
ALTER TABLE public.prayer_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view own requests"
  ON public.prayer_requests FOR SELECT TO authenticated
  USING (auth.uid() = requester_id);

-- Users can create requests
CREATE POLICY "Users can insert own requests"
  ON public.prayer_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id);

-- Admins can view all requests
CREATE POLICY "Admins can manage all requests"
  ON public.prayer_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Users can update own requests (e.g. close)
CREATE POLICY "Users can update own requests"
  ON public.prayer_requests FOR UPDATE TO authenticated
  USING (auth.uid() = requester_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.prayer_requests;

-- Trigger to update updated_at
CREATE TRIGGER trg_prayer_requests_updated
  BEFORE UPDATE ON public.prayer_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to notify requester when admin fulfills a team request
CREATE OR REPLACE FUNCTION public.notify_prayer_request_fulfilled()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'fulfilled' AND OLD.status != 'fulfilled' AND NEW.assigned_prayer_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      NEW.requester_id,
      'prayer_crafted',
      '🙏 KeepPray.ing has crafted a prayer for you',
      'A personal prayer has been lovingly written and added to your board.',
      '/board'
    );
    
    -- Also save the prayer to the requester's board
    INSERT INTO public.user_saved_prayers (user_id, prayer_id)
    VALUES (NEW.requester_id, NEW.assigned_prayer_id)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_prayer_request_fulfilled
  AFTER UPDATE ON public.prayer_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_prayer_request_fulfilled();

-- Trigger to notify standby warriors on community request
CREATE OR REPLACE FUNCTION public.notify_community_prayer_request()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_warrior record;
  v_requester_name text;
  v_count integer := 0;
BEGIN
  IF NEW.request_type != 'community' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(full_name, 'A fellow believer') INTO v_requester_name
  FROM public.profiles WHERE id = NEW.requester_id;

  -- Notify first batch of up to 5 active standby warriors
  FOR v_warrior IN
    SELECT user_id FROM public.prayer_standby
    WHERE is_active = true
      AND user_id != NEW.requester_id
      AND (expires_at IS NULL OR expires_at > now())
    ORDER BY started_at ASC
    LIMIT 5
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, link, metadata)
    VALUES (
      v_warrior.user_id,
      'community_prayer_request',
      v_requester_name || ' needs prayer',
      LEFT(NEW.message, 140),
      '/prayers',
      jsonb_build_object('request_id', NEW.id, 'is_urgent', NEW.is_urgent)
    );
    v_count := v_count + 1;
  END LOOP;

  -- Update escalation tracking
  UPDATE public.prayer_requests
  SET escalation_batch = 1, last_escalated_at = now()
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_community_prayer_request
  AFTER INSERT ON public.prayer_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_community_prayer_request();
