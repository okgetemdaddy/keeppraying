
-- Family Rooms
CREATE TABLE public.family_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  theme text NOT NULL DEFAULT 'golden-sunrise',
  invite_code text NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'),
  child_friendly boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(invite_code)
);
ALTER TABLE public.family_rooms ENABLE ROW LEVEL SECURITY;

-- Family Room Members
CREATE TABLE public.family_room_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.family_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id)
);
ALTER TABLE public.family_room_members ENABLE ROW LEVEL SECURITY;

-- Family Room Prayers
CREATE TABLE public.family_room_prayers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.family_rooms(id) ON DELETE CASCADE,
  prayer_id uuid NOT NULL REFERENCES public.prayer_cards(id) ON DELETE CASCADE,
  shared_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(room_id, prayer_id)
);
ALTER TABLE public.family_room_prayers ENABLE ROW LEVEL SECURITY;

-- Helper: check family room membership
CREATE OR REPLACE FUNCTION public.is_family_member(_user_id uuid, _room_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_room_members
    WHERE user_id = _user_id AND room_id = _room_id
  )
$$;

-- RLS: family_rooms (strict — only members can see)
CREATE POLICY "Members can view their family rooms"
  ON public.family_rooms FOR SELECT TO authenticated
  USING (public.is_family_member(auth.uid(), id));

CREATE POLICY "Anyone can lookup family rooms for joining"
  ON public.family_rooms FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create family rooms"
  ON public.family_rooms FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owners can update family rooms"
  ON public.family_rooms FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Owners can delete family rooms"
  ON public.family_rooms FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- RLS: family_room_members
CREATE POLICY "Members can view family room members"
  ON public.family_room_members FOR SELECT TO authenticated
  USING (public.is_family_member(auth.uid(), room_id));

CREATE POLICY "Users can join family rooms"
  ON public.family_room_members FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members can leave or owners can remove"
  ON public.family_room_members FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.family_rooms WHERE id = room_id AND created_by = auth.uid())
  );

-- RLS: family_room_prayers
CREATE POLICY "Members can view family room prayers"
  ON public.family_room_prayers FOR SELECT TO authenticated
  USING (public.is_family_member(auth.uid(), room_id));

CREATE POLICY "Members can share prayers"
  ON public.family_room_prayers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = shared_by AND public.is_family_member(auth.uid(), room_id));

CREATE POLICY "Members can remove shared prayers"
  ON public.family_room_prayers FOR DELETE TO authenticated
  USING (
    auth.uid() = shared_by
    OR EXISTS (SELECT 1 FROM public.family_rooms WHERE id = room_id AND created_by = auth.uid())
  );

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.family_room_prayers;
