
-- Prayer shares table
CREATE TABLE public.prayer_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_id uuid NOT NULL REFERENCES public.prayer_cards(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  recipient_id uuid,
  token text NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  message text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '30 days',
  UNIQUE(token)
);

ALTER TABLE public.prayer_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Senders manage own shares"
  ON public.prayer_shares FOR ALL TO authenticated
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipients can view their shares"
  ON public.prayer_shares FOR SELECT TO authenticated
  USING (auth.uid() = recipient_id);

CREATE POLICY "Recipients can update share status"
  ON public.prayer_shares FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id);

CREATE POLICY "Public can read unexpired shares by token"
  ON public.prayer_shares FOR SELECT TO anon, authenticated
  USING (expires_at > now());

-- Prayer share comments table
CREATE TABLE public.prayer_share_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id uuid NOT NULL REFERENCES public.prayer_shares(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prayer_share_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can manage share comments"
  ON public.prayer_share_comments FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.prayer_shares ps
      WHERE ps.id = prayer_share_comments.share_id
        AND (ps.sender_id = auth.uid() OR ps.recipient_id = auth.uid())
    )
  )
  WITH CHECK (
    auth.uid() = user_id AND EXISTS (
      SELECT 1 FROM public.prayer_shares ps
      WHERE ps.id = prayer_share_comments.share_id
        AND (ps.sender_id = auth.uid() OR ps.recipient_id = auth.uid())
    )
  );

-- Enable realtime for share comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.prayer_share_comments;

-- Trigger to notify recipient when a prayer is shared
CREATE OR REPLACE FUNCTION public.notify_prayer_shared()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_sender_name text;
  v_prayer_title text;
BEGIN
  IF NEW.recipient_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(full_name, 'Someone') INTO v_sender_name
  FROM public.profiles WHERE id = NEW.sender_id;

  SELECT COALESCE(title, LEFT(prayer_text, 60)) INTO v_prayer_title
  FROM public.prayer_cards WHERE id = NEW.prayer_id;

  INSERT INTO public.notifications (user_id, type, title, body, link, metadata)
  VALUES (
    NEW.recipient_id,
    'prayer_share',
    v_sender_name || ' shared a prayer with you',
    COALESCE(v_prayer_title, 'A personal prayer'),
    '/shared-prayer/' || NEW.token,
    jsonb_build_object('share_id', NEW.id, 'sender_id', NEW.sender_id)
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_prayer_share_created
  AFTER INSERT ON public.prayer_shares
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_prayer_shared();
