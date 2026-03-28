
CREATE OR REPLACE FUNCTION public.update_user_streak()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_last_date date;
  v_current integer;
  v_longest integer;
  v_today date := CURRENT_DATE;
  v_today_count integer;
  v_last_prayed_at timestamptz;
BEGIN
  -- Anti-gaming: check per-prayer-card limits (2x/day, 5hr gap)
  SELECT COUNT(*), MAX(created_at)
    INTO v_today_count, v_last_prayed_at
    FROM public.prayed_actions
    WHERE user_id = NEW.user_id
      AND prayer_id = NEW.prayer_id
      AND created_at::date = v_today
      AND id != NEW.id;

  -- Already prayed this card twice today - skip streak update
  IF v_today_count >= 2 THEN
    RETURN NEW;
  END IF;

  -- Last pray on this card was less than 5 hours ago - skip streak update
  IF v_last_prayed_at IS NOT NULL AND (NOW() - v_last_prayed_at) < interval '5 hours' THEN
    RETURN NEW;
  END IF;

  SELECT last_prayed_date, current_streak, longest_streak
    INTO v_last_date, v_current, v_longest
    FROM public.profiles
    WHERE id = NEW.user_id;

  -- Already prayed today, no streak change
  IF v_last_date = v_today THEN
    RETURN NEW;
  END IF;

  -- Consecutive day
  IF v_last_date = v_today - 1 THEN
    v_current := v_current + 1;
  ELSE
    v_current := 1;
  END IF;

  IF v_current > v_longest THEN
    v_longest := v_current;
  END IF;

  UPDATE public.profiles
    SET current_streak = v_current,
        longest_streak = v_longest,
        last_prayed_date = v_today,
        updated_at = NOW()
    WHERE id = NEW.user_id;

  RETURN NEW;
END;
$function$;
