
-- 1. Drop old status check constraint
ALTER TABLE public.prayer_cards DROP CONSTRAINT IF EXISTS prayer_cards_status_check;

-- 2. Add new constraint that includes 'private'
ALTER TABLE public.prayer_cards ADD CONSTRAINT prayer_cards_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'ai_generated', 'private'));

-- 3. Add RLS: owners can always view their own prayers regardless of status
CREATE POLICY "Users can view own prayers"
  ON public.prayer_cards FOR SELECT
  USING (auth.uid() = created_by);

-- 4. Drop old UPDATE policy and replace with one that covers private + pending
DROP POLICY IF EXISTS "Users can update own pending prayers" ON public.prayer_cards;

CREATE POLICY "Users can update own prayers"
  ON public.prayer_cards FOR UPDATE
  USING (auth.uid() = created_by AND status IN ('pending', 'private'));
