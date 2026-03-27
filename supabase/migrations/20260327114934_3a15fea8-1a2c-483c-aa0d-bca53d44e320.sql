-- Accountability Circles
CREATE TABLE public.accountability_circles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  invite_code text NOT NULL DEFAULT encode(extensions.gen_random_bytes(6), 'hex'),
  created_by uuid NOT NULL,
  max_members smallint NOT NULL DEFAULT 5,
  ai_encouragement boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT max_members_range CHECK (max_members >= 3 AND max_members <= 5)
);

CREATE TABLE public.accountability_circle_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid NOT NULL REFERENCES public.accountability_circles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(circle_id, user_id)
);

CREATE TABLE public.accountability_circle_prayers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid NOT NULL REFERENCES public.accountability_circles(id) ON DELETE CASCADE,
  prayer_id uuid NOT NULL REFERENCES public.prayer_cards(id) ON DELETE CASCADE,
  shared_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.accountability_encouragements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid NOT NULL REFERENCES public.accountability_circles(id) ON DELETE CASCADE,
  content text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now()
);

-- Security definer function for circle membership check
CREATE OR REPLACE FUNCTION public.is_circle_member(_user_id uuid, _circle_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.accountability_circle_members
    WHERE user_id = _user_id AND circle_id = _circle_id
  )
$$;

-- RLS
ALTER TABLE public.accountability_circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accountability_circle_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accountability_circle_prayers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accountability_encouragements ENABLE ROW LEVEL SECURITY;

-- Circles policies
CREATE POLICY "Anyone can lookup circles for joining" ON public.accountability_circles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create circles" ON public.accountability_circles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Owners can update circles" ON public.accountability_circles
  FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Owners can delete circles" ON public.accountability_circles
  FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- Members policies
CREATE POLICY "Members can view circle members" ON public.accountability_circle_members
  FOR SELECT TO authenticated USING (is_circle_member(auth.uid(), circle_id));
CREATE POLICY "Users can join circles" ON public.accountability_circle_members
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Members can leave or owners can remove" ON public.accountability_circle_members
  FOR DELETE TO authenticated USING (
    auth.uid() = user_id OR EXISTS (
      SELECT 1 FROM public.accountability_circles
      WHERE id = accountability_circle_members.circle_id AND created_by = auth.uid()
    )
  );

-- Circle prayers policies
CREATE POLICY "Members can view circle prayers" ON public.accountability_circle_prayers
  FOR SELECT TO authenticated USING (is_circle_member(auth.uid(), circle_id));
CREATE POLICY "Members can share prayers" ON public.accountability_circle_prayers
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = shared_by AND is_circle_member(auth.uid(), circle_id));
CREATE POLICY "Members can remove own shared prayers" ON public.accountability_circle_prayers
  FOR DELETE TO authenticated USING (
    auth.uid() = shared_by OR EXISTS (
      SELECT 1 FROM public.accountability_circles
      WHERE id = accountability_circle_prayers.circle_id AND created_by = auth.uid()
    )
  );

-- Encouragements policies
CREATE POLICY "Members can view encouragements" ON public.accountability_encouragements
  FOR SELECT TO authenticated USING (is_circle_member(auth.uid(), circle_id));
CREATE POLICY "Service role can insert encouragements" ON public.accountability_encouragements
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Enable realtime for circle prayers
ALTER PUBLICATION supabase_realtime ADD TABLE public.accountability_circle_prayers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.accountability_circle_members;