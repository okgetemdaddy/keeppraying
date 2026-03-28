
-- Trigger: notify when someone responds to a prayer via standby
CREATE OR REPLACE FUNCTION public.notify_standby_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_prayer_owner uuid;
  v_responder_name text;
BEGIN
  -- Get the prayer owner
  SELECT created_by INTO v_prayer_owner
  FROM public.prayer_cards WHERE id = NEW.prayer_id;

  IF v_prayer_owner IS NULL OR v_prayer_owner = NEW.responder_id THEN
    RETURN NEW;
  END IF;

  -- Get responder name
  SELECT COALESCE(full_name, 'A prayer warrior') INTO v_responder_name
  FROM public.profiles WHERE id = NEW.responder_id;

  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (
    v_prayer_owner,
    'standby_response',
    v_responder_name || ' is praying for you',
    LEFT(NEW.message, 120),
    '/prayer/' || NEW.prayer_id
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_standby_response
  AFTER INSERT ON public.standby_responses
  FOR EACH ROW EXECUTE FUNCTION public.notify_standby_response();

-- Trigger: notify when a prayer is shared to a group
CREATE OR REPLACE FUNCTION public.notify_group_prayer_shared()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_group_name text;
  v_sharer_name text;
  v_member record;
BEGIN
  SELECT name INTO v_group_name FROM public.prayer_groups WHERE id = NEW.group_id;
  SELECT COALESCE(full_name, 'Someone') INTO v_sharer_name FROM public.profiles WHERE id = NEW.shared_by;

  FOR v_member IN
    SELECT user_id FROM public.prayer_group_members
    WHERE group_id = NEW.group_id AND user_id != NEW.shared_by
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      v_member.user_id,
      'group_prayer',
      'New prayer in ' || v_group_name,
      v_sharer_name || ' shared a prayer with your group',
      '/groups/' || NEW.group_id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_group_prayer_shared
  AFTER INSERT ON public.prayer_group_prayers
  FOR EACH ROW EXECUTE FUNCTION public.notify_group_prayer_shared();

-- Trigger: notify when a prayer is shared to a family room
CREATE OR REPLACE FUNCTION public.notify_family_prayer_shared()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_room_name text;
  v_sharer_name text;
  v_member record;
BEGIN
  SELECT name INTO v_room_name FROM public.family_rooms WHERE id = NEW.room_id;
  SELECT COALESCE(full_name, 'Someone') INTO v_sharer_name FROM public.profiles WHERE id = NEW.shared_by;

  FOR v_member IN
    SELECT user_id FROM public.family_room_members
    WHERE room_id = NEW.room_id AND user_id != NEW.shared_by
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      v_member.user_id,
      'family_prayer',
      'New prayer in ' || v_room_name,
      v_sharer_name || ' shared a prayer with your family room',
      '/family/' || NEW.room_id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_family_prayer_shared
  AFTER INSERT ON public.family_room_prayers
  FOR EACH ROW EXECUTE FUNCTION public.notify_family_prayer_shared();

-- Trigger: streak milestone notifications (every 7 days)
CREATE OR REPLACE FUNCTION public.notify_streak_milestone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.current_streak > OLD.current_streak AND NEW.current_streak > 0 AND (NEW.current_streak % 7 = 0) THEN
    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (
      NEW.id,
      'streak_milestone',
      '🔥 ' || NEW.current_streak || '-day prayer streak!',
      'Your faithfulness is inspiring. Keep pressing in — the Lord hears every prayer.'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_streak_milestone
  AFTER UPDATE OF current_streak ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.notify_streak_milestone();
