
-- 1. prayer_partners (must come first - referenced by other policies)
CREATE TABLE public.prayer_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id uuid NOT NULL,
  user2_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  UNIQUE (user1_id, user2_id)
);

ALTER TABLE public.prayer_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own partnerships" ON public.prayer_partners
  FOR SELECT TO authenticated USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can create partnership requests" ON public.prayer_partners
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user1_id);

CREATE POLICY "Partners can update partnership" ON public.prayer_partners
  FOR UPDATE TO authenticated USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Partners can delete partnership" ON public.prayer_partners
  FOR DELETE TO authenticated USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- 2. companion_settings
CREATE TABLE public.companion_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_type text NOT NULL CHECK (group_type IN ('family', 'circle')),
  group_id uuid NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  checkin_day text NOT NULL DEFAULT 'Sunday',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_type, group_id)
);

ALTER TABLE public.companion_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view companion settings" ON public.companion_settings
  FOR SELECT TO authenticated
  USING (
    (group_type = 'family' AND is_family_member(auth.uid(), group_id))
    OR (group_type = 'circle' AND is_circle_member(auth.uid(), group_id))
  );

CREATE POLICY "Leaders can insert companion settings" ON public.companion_settings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Leaders can update companion settings" ON public.companion_settings
  FOR UPDATE TO authenticated USING (auth.uid() = created_by);

-- 3. companion_checkins
CREATE TABLE public.companion_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_type text NOT NULL CHECK (group_type IN ('family', 'circle', 'partner')),
  group_id uuid NOT NULL,
  user_id uuid NOT NULL,
  mood text NOT NULL CHECK (mood IN ('thriving', 'steady', 'struggling')),
  share_text text,
  is_shared boolean NOT NULL DEFAULT false,
  week_of date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_type, group_id, user_id, week_of)
);

ALTER TABLE public.companion_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own checkins" ON public.companion_checkins
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Members can view shared group checkins" ON public.companion_checkins
  FOR SELECT TO authenticated
  USING (
    is_shared = true AND (
      (group_type = 'family' AND is_family_member(auth.uid(), group_id))
      OR (group_type = 'circle' AND is_circle_member(auth.uid(), group_id))
      OR (group_type = 'partner' AND EXISTS (
        SELECT 1 FROM public.prayer_partners
        WHERE id = companion_checkins.group_id AND status = 'accepted'
          AND (user1_id = auth.uid() OR user2_id = auth.uid())
      ))
    )
  );

CREATE POLICY "Users can insert own checkins" ON public.companion_checkins
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own checkins" ON public.companion_checkins
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 4. companion_goals
CREATE TABLE public.companion_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_type text NOT NULL CHECK (group_type IN ('family', 'circle', 'partner')),
  group_id uuid NOT NULL,
  user_id uuid NOT NULL,
  title text NOT NULL,
  target_count int NOT NULL DEFAULT 7,
  current_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.companion_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view group goals" ON public.companion_goals
  FOR SELECT TO authenticated
  USING (
    (group_type = 'family' AND is_family_member(auth.uid(), group_id))
    OR (group_type = 'circle' AND is_circle_member(auth.uid(), group_id))
    OR (group_type = 'partner' AND EXISTS (
      SELECT 1 FROM public.prayer_partners
      WHERE id = companion_goals.group_id AND status = 'accepted'
        AND (user1_id = auth.uid() OR user2_id = auth.uid())
    ))
  );

CREATE POLICY "Users can insert own goals" ON public.companion_goals
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals" ON public.companion_goals
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals" ON public.companion_goals
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 5. companion_encouragements
CREATE TABLE public.companion_encouragements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_type text NOT NULL CHECK (group_type IN ('family', 'circle', 'partner')),
  group_id uuid NOT NULL,
  from_user_id uuid NOT NULL,
  to_user_id uuid NOT NULL,
  message text NOT NULL DEFAULT '',
  emoji text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.companion_encouragements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view encouragements they sent or received" ON public.companion_encouragements
  FOR SELECT TO authenticated USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can send encouragements" ON public.companion_encouragements
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can delete own sent encouragements" ON public.companion_encouragements
  FOR DELETE TO authenticated USING (auth.uid() = from_user_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.companion_checkins;
ALTER PUBLICATION supabase_realtime ADD TABLE public.companion_goals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.companion_encouragements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.companion_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.prayer_partners;

-- Trigger: notify standby on struggling checkin
CREATE OR REPLACE FUNCTION public.notify_struggling_companion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_group_name text; v_warrior record;
BEGIN
  IF NEW.mood != 'struggling' THEN RETURN NEW; END IF;
  IF NEW.group_type = 'family' THEN
    SELECT name INTO v_group_name FROM public.family_rooms WHERE id = NEW.group_id;
  ELSIF NEW.group_type = 'circle' THEN
    SELECT name INTO v_group_name FROM public.accountability_circles WHERE id = NEW.group_id;
  ELSE RETURN NEW; END IF;

  FOR v_warrior IN
    SELECT ps.user_id FROM public.prayer_standby ps
    WHERE ps.is_active = true AND (ps.expires_at IS NULL OR ps.expires_at > now())
      AND ps.user_id != NEW.user_id
      AND (
        (NEW.group_type = 'family' AND EXISTS (SELECT 1 FROM public.family_room_members WHERE room_id = NEW.group_id AND user_id = ps.user_id))
        OR (NEW.group_type = 'circle' AND EXISTS (SELECT 1 FROM public.accountability_circle_members WHERE circle_id = NEW.group_id AND user_id = ps.user_id))
      )
    LIMIT 5
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (v_warrior.user_id, 'companion_struggling',
      'A companion in ' || COALESCE(v_group_name, 'your group') || ' could use prayer 🤲',
      'Someone in your group is going through a difficult season. Your prayers mean everything.',
      CASE WHEN NEW.group_type = 'family' THEN '/family/' || NEW.group_id ELSE '/circles/' || NEW.group_id END);
  END LOOP;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_struggling_companion
  AFTER INSERT ON public.companion_checkins FOR EACH ROW
  EXECUTE FUNCTION public.notify_struggling_companion();

-- Trigger: notify on partner request
CREATE OR REPLACE FUNCTION public.notify_partner_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_requester_name text;
BEGIN
  SELECT COALESCE(full_name, 'A fellow believer') INTO v_requester_name FROM public.profiles WHERE id = NEW.user1_id;
  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (NEW.user2_id, 'partner_request',
    v_requester_name || ' wants to walk with you in prayer',
    'You have been invited to become prayer partners — a beautiful commitment to pray for one another.',
    '/profile');
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_partner_request
  AFTER INSERT ON public.prayer_partners FOR EACH ROW
  EXECUTE FUNCTION public.notify_partner_request();
