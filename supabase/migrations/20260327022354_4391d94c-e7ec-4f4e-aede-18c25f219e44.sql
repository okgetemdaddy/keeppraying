
-- Prayer Groups
CREATE TABLE public.prayer_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  theme text NOT NULL DEFAULT 'golden-sunrise',
  invite_code text NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(invite_code)
);

ALTER TABLE public.prayer_groups ENABLE ROW LEVEL SECURITY;

-- Group Members
CREATE TABLE public.prayer_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.prayer_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

ALTER TABLE public.prayer_group_members ENABLE ROW LEVEL SECURITY;

-- Group Prayers (shared to group)
CREATE TABLE public.prayer_group_prayers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.prayer_groups(id) ON DELETE CASCADE,
  prayer_id uuid NOT NULL REFERENCES public.prayer_cards(id) ON DELETE CASCADE,
  shared_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, prayer_id)
);

ALTER TABLE public.prayer_group_prayers ENABLE ROW LEVEL SECURITY;

-- Helper: check if user is member of a group
CREATE OR REPLACE FUNCTION public.is_group_member(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.prayer_group_members
    WHERE user_id = _user_id AND group_id = _group_id
  )
$$;

-- RLS: prayer_groups
CREATE POLICY "Members can view their groups"
  ON public.prayer_groups FOR SELECT
  TO authenticated
  USING (public.is_group_member(auth.uid(), id));

CREATE POLICY "Authenticated users can create groups"
  ON public.prayer_groups FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owners can update groups"
  ON public.prayer_groups FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Owners can delete groups"
  ON public.prayer_groups FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- RLS: prayer_group_members
CREATE POLICY "Members can view group members"
  ON public.prayer_group_members FOR SELECT
  TO authenticated
  USING (public.is_group_member(auth.uid(), group_id));

CREATE POLICY "Users can insert themselves as members"
  ON public.prayer_group_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can remove members"
  ON public.prayer_group_members FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.prayer_groups
      WHERE id = group_id AND created_by = auth.uid()
    )
  );

-- RLS: prayer_group_prayers
CREATE POLICY "Members can view group prayers"
  ON public.prayer_group_prayers FOR SELECT
  TO authenticated
  USING (public.is_group_member(auth.uid(), group_id));

CREATE POLICY "Members can share prayers to group"
  ON public.prayer_group_prayers FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = shared_by
    AND public.is_group_member(auth.uid(), group_id)
  );

CREATE POLICY "Members can remove own shared prayers"
  ON public.prayer_group_prayers FOR DELETE
  TO authenticated
  USING (
    auth.uid() = shared_by
    OR EXISTS (
      SELECT 1 FROM public.prayer_groups
      WHERE id = group_id AND created_by = auth.uid()
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.prayer_group_prayers;

-- Allow anyone authenticated to look up a group by invite_code (for joining)
CREATE POLICY "Anyone can lookup groups by invite code"
  ON public.prayer_groups FOR SELECT
  TO authenticated
  USING (true);
