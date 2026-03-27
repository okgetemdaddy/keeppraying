
-- Add streak columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS current_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_prayed_date date;

-- Create a function to update streaks when a prayed_action is inserted
CREATE OR REPLACE FUNCTION public.update_user_streak()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_date date;
  v_current integer;
  v_longest integer;
  v_today date := CURRENT_DATE;
BEGIN
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
    -- Streak broken or first time
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
$$;

-- Attach trigger to prayed_actions
DROP TRIGGER IF EXISTS trg_update_streak ON public.prayed_actions;
CREATE TRIGGER trg_update_streak
  AFTER INSERT ON public.prayed_actions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_streak();
