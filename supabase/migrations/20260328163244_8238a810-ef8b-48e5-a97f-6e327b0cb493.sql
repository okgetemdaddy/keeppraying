
-- 1. Expand accountability_circles for unified Circles (merging Groups + Circles)
ALTER TABLE public.accountability_circles
  ADD COLUMN IF NOT EXISTS purpose text,
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS schedule jsonb;

ALTER TABLE public.accountability_circles
  ALTER COLUMN max_members SET DEFAULT 50;

-- 2. Expand family_rooms with schedule and purpose
ALTER TABLE public.family_rooms
  ADD COLUMN IF NOT EXISTS purpose text,
  ADD COLUMN IF NOT EXISTS schedule jsonb;

-- 3. Circle homework
CREATE TABLE public.circle_homework (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid NOT NULL REFERENCES public.accountability_circles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  homework_type text NOT NULL DEFAULT 'custom',
  due_date timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.circle_homework ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view circle homework" ON public.circle_homework
  FOR SELECT TO authenticated
  USING (is_circle_member(auth.uid(), circle_id));

CREATE POLICY "Leaders can insert homework" ON public.circle_homework
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM public.accountability_circle_members
      WHERE circle_id = circle_homework.circle_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'leader')
    )
  );

CREATE POLICY "Leaders can update homework" ON public.circle_homework
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.accountability_circle_members
      WHERE circle_id = circle_homework.circle_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'leader')
    )
  );

CREATE POLICY "Leaders can delete homework" ON public.circle_homework
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.accountability_circle_members
      WHERE circle_id = circle_homework.circle_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'leader')
    )
  );

-- 4. Circle homework submissions
CREATE TABLE public.circle_homework_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  homework_id uuid NOT NULL REFERENCES public.circle_homework(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text,
  prayer_id uuid REFERENCES public.prayer_cards(id),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(homework_id, user_id)
);

ALTER TABLE public.circle_homework_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view submissions" ON public.circle_homework_submissions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.circle_homework h
      WHERE h.id = circle_homework_submissions.homework_id
        AND is_circle_member(auth.uid(), h.circle_id)
    )
  );

CREATE POLICY "Users can submit own homework" ON public.circle_homework_submissions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own submissions" ON public.circle_homework_submissions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- 5. Family homework
CREATE TABLE public.family_homework (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.family_rooms(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  homework_type text NOT NULL DEFAULT 'custom',
  due_date timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.family_homework ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view family homework" ON public.family_homework
  FOR SELECT TO authenticated
  USING (is_family_member(auth.uid(), room_id));

CREATE POLICY "Leaders can insert family homework" ON public.family_homework
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM public.family_room_members
      WHERE room_id = family_homework.room_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'leader')
    )
  );

CREATE POLICY "Leaders can update family homework" ON public.family_homework
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.family_room_members
      WHERE room_id = family_homework.room_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'leader')
    )
  );

CREATE POLICY "Leaders can delete family homework" ON public.family_homework
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.family_room_members
      WHERE room_id = family_homework.room_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'leader')
    )
  );

-- 6. Family homework submissions
CREATE TABLE public.family_homework_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  homework_id uuid NOT NULL REFERENCES public.family_homework(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text,
  prayer_id uuid REFERENCES public.prayer_cards(id),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(homework_id, user_id)
);

ALTER TABLE public.family_homework_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view family submissions" ON public.family_homework_submissions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.family_homework h
      WHERE h.id = family_homework_submissions.homework_id
        AND is_family_member(auth.uid(), h.room_id)
    )
  );

CREATE POLICY "Users can submit own family homework" ON public.family_homework_submissions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own family submissions" ON public.family_homework_submissions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- 7. Enable realtime for homework tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.circle_homework;
ALTER PUBLICATION supabase_realtime ADD TABLE public.circle_homework_submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.family_homework;
ALTER PUBLICATION supabase_realtime ADD TABLE public.family_homework_submissions;
