-- Core testimonies table
CREATE TABLE public.testimonies (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_id   uuid NOT NULL REFERENCES public.prayer_cards(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL,
  body        text NOT NULL,
  flagged     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT testimonies_body_length CHECK (char_length(body) <= 4000)
);

-- Likes on testimonies
CREATE TABLE public.testimony_likes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  testimony_id  uuid NOT NULL REFERENCES public.testimonies(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(testimony_id, user_id)
);

-- Flags for admin review
CREATE TABLE public.testimony_flags (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  testimony_id  uuid NOT NULL REFERENCES public.testimonies(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL,
  reason        text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(testimony_id, user_id)
);

-- Comments on testimonies
CREATE TABLE public.testimony_comments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  testimony_id  uuid NOT NULL REFERENCES public.testimonies(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL,
  body          text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT testimony_comments_body_length CHECK (char_length(body) <= 500)
);

ALTER TABLE public.testimonies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimony_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimony_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimony_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view testimonies" ON public.testimonies FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert own testimony" ON public.testimonies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own testimony" ON public.testimonies FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage testimonies" ON public.testimonies FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view testimony likes" ON public.testimony_likes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage own likes" ON public.testimony_likes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert own flag" ON public.testimony_flags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own flags" ON public.testimony_flags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all flags" ON public.testimony_flags FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view testimony comments" ON public.testimony_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert own comment" ON public.testimony_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comment" ON public.testimony_comments FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_testimonies_prayer_id ON public.testimonies(prayer_id);
CREATE INDEX idx_testimonies_user_id ON public.testimonies(user_id);
CREATE INDEX idx_testimony_likes_testimony_id ON public.testimony_likes(testimony_id);
CREATE INDEX idx_testimony_flags_testimony_id ON public.testimony_flags(testimony_id);
CREATE INDEX idx_testimony_comments_testimony_id ON public.testimony_comments(testimony_id);