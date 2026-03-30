
-- Create sermon_prayer_plans table
CREATE TABLE public.sermon_prayer_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  sermon_title text NOT NULL,
  video_id text,
  daily_prompts jsonb NOT NULL DEFAULT '[]'::jsonb,
  starts_on date NOT NULL DEFAULT CURRENT_DATE,
  accountability_enabled boolean NOT NULL DEFAULT true,
  encouragement_enabled boolean NOT NULL DEFAULT true,
  reminder_time text NOT NULL DEFAULT 'Morning',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create sermon_plan_members table
CREATE TABLE public.sermon_plan_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.sermon_prayer_plans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  completed_days jsonb NOT NULL DEFAULT '{}'::jsonb,
  joined_at timestamptz NOT NULL DEFAULT now(),
  accountability_enabled boolean NOT NULL DEFAULT true,
  encouragement_enabled boolean NOT NULL DEFAULT true,
  UNIQUE(plan_id, user_id)
);

-- Create sermon_plan_encouragements table
CREATE TABLE public.sermon_plan_encouragements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.sermon_prayer_plans(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL,
  to_user_id uuid NOT NULL,
  message text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Helper function to check sermon plan membership
CREATE OR REPLACE FUNCTION public.is_sermon_plan_member(_user_id uuid, _plan_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sermon_plan_members
    WHERE user_id = _user_id AND plan_id = _plan_id
  )
$$;

-- Enable RLS
ALTER TABLE public.sermon_prayer_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sermon_plan_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sermon_plan_encouragements ENABLE ROW LEVEL SECURITY;

-- RLS: sermon_prayer_plans
CREATE POLICY "Creators can manage own plans" ON public.sermon_prayer_plans
  FOR ALL TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Members can view plans" ON public.sermon_prayer_plans
  FOR SELECT TO authenticated
  USING (is_sermon_plan_member(auth.uid(), id));

-- RLS: sermon_plan_members
CREATE POLICY "Users can join plans" ON public.sermon_plan_members
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members can view plan members" ON public.sermon_plan_members
  FOR SELECT TO authenticated
  USING (is_sermon_plan_member(auth.uid(), plan_id));

CREATE POLICY "Users can update own membership" ON public.sermon_plan_members
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can leave plans" ON public.sermon_plan_members
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.sermon_prayer_plans WHERE id = plan_id AND created_by = auth.uid()
  ));

-- RLS: sermon_plan_encouragements
CREATE POLICY "Members can send encouragements" ON public.sermon_plan_encouragements
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = from_user_id AND is_sermon_plan_member(auth.uid(), plan_id));

CREATE POLICY "Users can view own encouragements" ON public.sermon_plan_encouragements
  FOR SELECT TO authenticated
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- Updated_at trigger
CREATE TRIGGER update_sermon_prayer_plans_updated_at
  BEFORE UPDATE ON public.sermon_prayer_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
