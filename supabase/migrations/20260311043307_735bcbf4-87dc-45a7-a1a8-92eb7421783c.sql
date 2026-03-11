-- Add source column to prayer_cards to distinguish admin vs community prayers
ALTER TABLE public.prayer_cards ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'community';

-- Backfill: mark existing ai_generated cards as admin-sourced, user-submitted as community
UPDATE public.prayer_cards SET source = 'admin' WHERE status = 'ai_generated';

-- Backfill existing approved prayers: if created_by matches an admin profile, mark admin
UPDATE public.prayer_cards pc
SET source = 'admin'
FROM public.profiles p
WHERE pc.created_by = p.id AND p.role = 'admin';

-- Index for filtering by source
CREATE INDEX IF NOT EXISTS idx_prayer_cards_source ON public.prayer_cards(source);

-- Function: auto-set source on insert based on creator role
CREATE OR REPLACE FUNCTION public.set_prayer_source()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  creator_role TEXT;
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.source := 'admin';
    RETURN NEW;
  END IF;
  SELECT role INTO creator_role FROM public.profiles WHERE id = NEW.created_by;
  IF creator_role = 'admin' THEN
    NEW.source := 'admin';
  ELSE
    NEW.source := 'community';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_prayer_source
  BEFORE INSERT ON public.prayer_cards
  FOR EACH ROW EXECUTE FUNCTION public.set_prayer_source();
