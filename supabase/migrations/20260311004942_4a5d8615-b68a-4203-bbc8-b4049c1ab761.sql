
-- =====================================================
-- KeepPray.ing — Full Database Schema
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =====================================================
-- PROFILES
-- =====================================================
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- PRAYER CARDS
-- =====================================================
CREATE TABLE public.prayer_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  prayer_text TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  extended_prayer TEXT,
  background_url TEXT,
  text_style VARCHAR(20) DEFAULT 'classic',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'ai_generated')),
  views INTEGER NOT NULL DEFAULT 0,
  likes_count INTEGER NOT NULL DEFAULT 0,
  prayed_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.prayer_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view approved prayers" ON public.prayer_cards
  FOR SELECT USING (status IN ('approved', 'ai_generated'));
CREATE POLICY "Authenticated users can create prayers" ON public.prayer_cards
  FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own pending prayers" ON public.prayer_cards
  FOR UPDATE USING (auth.uid() = created_by AND status = 'pending');
CREATE POLICY "Admins can manage all prayers" ON public.prayer_cards
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE INDEX idx_prayer_cards_status ON public.prayer_cards(status);
CREATE INDEX idx_prayer_cards_created_at ON public.prayer_cards(created_at DESC);
CREATE INDEX idx_prayer_cards_tags ON public.prayer_cards USING GIN(tags);
CREATE INDEX idx_prayer_cards_likes ON public.prayer_cards(likes_count DESC);
CREATE INDEX idx_prayer_cards_text_search ON public.prayer_cards USING GIN(to_tsvector('english', prayer_text));
ALTER TABLE public.prayer_cards REPLICA IDENTITY FULL;

-- =====================================================
-- USER SAVED PRAYERS
-- =====================================================
CREATE TABLE public.user_saved_prayers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prayer_id UUID NOT NULL REFERENCES public.prayer_cards(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,
  pinned BOOLEAN DEFAULT FALSE,
  favorite BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, prayer_id)
);
ALTER TABLE public.user_saved_prayers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own saved prayers" ON public.user_saved_prayers FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_saved_prayers_user ON public.user_saved_prayers(user_id);

-- =====================================================
-- COMMENTS
-- =====================================================
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_id UUID NOT NULL REFERENCES public.prayer_cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view comments" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can comment" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.comments FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_comments_prayer ON public.comments(prayer_id);
ALTER TABLE public.comments REPLICA IDENTITY FULL;

-- =====================================================
-- LIKES
-- =====================================================
CREATE TABLE public.likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_id UUID NOT NULL REFERENCES public.prayer_cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(prayer_id, user_id)
);
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage likes" ON public.likes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view likes" ON public.likes FOR SELECT USING (true);
CREATE INDEX idx_likes_prayer ON public.likes(prayer_id);
CREATE INDEX idx_likes_user ON public.likes(user_id);
ALTER TABLE public.likes REPLICA IDENTITY FULL;

CREATE OR REPLACE FUNCTION public.update_prayer_likes_count()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.prayer_cards SET likes_count = likes_count + 1 WHERE id = NEW.prayer_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.prayer_cards SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.prayer_id;
    RETURN OLD;
  END IF;
END;
$$;
CREATE TRIGGER on_like_change AFTER INSERT OR DELETE ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.update_prayer_likes_count();

-- =====================================================
-- PRAYED ACTIONS
-- =====================================================
CREATE TABLE public.prayed_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_id UUID NOT NULL REFERENCES public.prayer_cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(prayer_id, user_id)
);
ALTER TABLE public.prayed_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage prayed" ON public.prayed_actions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view prayed count" ON public.prayed_actions FOR SELECT USING (true);
CREATE INDEX idx_prayed_prayer ON public.prayed_actions(prayer_id);
ALTER TABLE public.prayed_actions REPLICA IDENTITY FULL;

CREATE OR REPLACE FUNCTION public.update_prayer_prayed_count()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.prayer_cards SET prayed_count = prayed_count + 1 WHERE id = NEW.prayer_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.prayer_cards SET prayed_count = GREATEST(0, prayed_count - 1) WHERE id = OLD.prayer_id;
    RETURN OLD;
  END IF;
END;
$$;
CREATE TRIGGER on_prayed_change AFTER INSERT OR DELETE ON public.prayed_actions
  FOR EACH ROW EXECUTE FUNCTION public.update_prayer_prayed_count();

-- =====================================================
-- PRAYER PLAYLISTS
-- =====================================================
CREATE TABLE public.prayer_playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  prayer_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.prayer_playlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own playlists" ON public.prayer_playlists FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- BLOG POSTS
-- =====================================================
CREATE TABLE public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT,
  excerpt TEXT,
  cover_image_url TEXT,
  author_id UUID REFERENCES auth.users(id),
  published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view published posts" ON public.blog_posts FOR SELECT USING (published = true);
CREATE POLICY "Admins can manage posts" ON public.blog_posts
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- =====================================================
-- CONTACT SUBMISSIONS
-- =====================================================
CREATE TABLE public.contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit contact" ON public.contact_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view submissions" ON public.contact_submissions
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- =====================================================
-- AI CHAT LOGS
-- =====================================================
CREATE TABLE public.ai_chat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_message TEXT NOT NULL,
  ai_response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.ai_chat_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own chat logs" ON public.ai_chat_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Admins can view all chat logs" ON public.ai_chat_logs
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Users can view own chat logs" ON public.ai_chat_logs
  FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- SHARED TIMESTAMP TRIGGER
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_prayer_cards_updated_at BEFORE UPDATE ON public.prayer_cards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- STORAGE
-- =====================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('prayer-backgrounds', 'prayer-backgrounds', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

CREATE POLICY "Anyone can view prayer backgrounds" ON storage.objects FOR SELECT USING (bucket_id = 'prayer-backgrounds');
CREATE POLICY "Authenticated users can upload backgrounds" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'prayer-backgrounds' AND auth.role() = 'authenticated');
CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =====================================================
-- SEED DATA
-- =====================================================
INSERT INTO public.prayer_cards (title, prayer_text, tags, extended_prayer, status, text_style, views, likes_count, prayed_count) VALUES
('The Lord''s Prayer', 'Our Father in heaven, hallowed be your name. Your kingdom come, your will be done, on earth as it is in heaven. Give us this day our daily bread, and forgive us our debts, as we also have forgiven our debtors. And lead us not into temptation, but deliver us from evil.', ARRAY['lords-prayer','matthew-6','foundational','daily-prayer','forgiveness'], 'For Yours is the kingdom, and the power, and the glory, forever. Amen. — Matthew 6:9-13', 'approved', 'scripture', 1240, 847, 2103),
('A Prayer of Peace', 'Lord, I come to You casting every anxiety at Your feet. Do not let me be anxious about anything, but in everything by prayer and supplication with thanksgiving, let my requests be made known to You. Guard my heart and mind with Your peace that surpasses all understanding.', ARRAY['peace','anxiety','philippians','trust','daily-prayer'], 'And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus. — Philippians 4:6-7', 'approved', 'peaceful', 892, 634, 1587),
('Ask, Seek, Knock', 'Father, I come before You with faith, believing Your promise — that everyone who asks receives, everyone who seeks finds, and to the one who knocks the door will be opened. I ask, seek, and knock today with confidence in Your unfailing love.', ARRAY['faith','promise','matthew-7','confidence','answered-prayer'], 'Ask and it will be given to you; seek and you will find; knock and the door will be opened to you. — Matthew 7:7-8', 'approved', 'bold', 756, 512, 934),
('Pray Without Ceasing', 'Holy Spirit, teach me to rejoice always, to pray without ceasing, and to give thanks in all circumstances. In the mundane and the magnificent, let my whole life be a conversation with You, my Father.', ARRAY['continuous-prayer','holy-spirit','thessalonians','gratitude'], 'Rejoice always, pray continually, give thanks in all circumstances; for this is God''s will for you in Christ Jesus. — 1 Thessalonians 5:16-18', 'approved', 'gentle', 621, 408, 876),
('Spiritual Armor Prayer', 'Lord, clothe me today in Your full armor — truth as my belt, righteousness as my breastplate, faith as my shield, salvation as my helmet, and Your Word as my sword. Teach me to pray at all times in the Spirit for all the saints.', ARRAY['spiritual-warfare','armor-of-god','ephesians','protection','intercession'], 'And pray in the Spirit on all occasions with all kinds of prayers and requests. — Ephesians 6:18', 'approved', 'strong', 534, 389, 721),
('Morning Surrender', 'Good morning, Father. Before this day begins, I lay it at Your feet. Guide every thought, word, and step. Fill me with Your Spirit. Let Your light shine through my life today, and may every moment bring glory to Your name.', ARRAY['morning-prayer','surrender','daily-prayer','guidance'], NULL, 'approved', 'classic', 903, 671, 1432),
('Intercessory Prayer', 'Lord, I lift up those who are hurting — those I know and those I will never meet. I pray for healing in bodies, restoration in relationships, and breakthrough in impossible situations. I stand in the gap, trusting the prayer of a righteous person is powerful.', ARRAY['intercession','healing','james','community','praying-for-others'], 'The prayer of a righteous person is powerful and effective. — James 5:16', 'approved', 'compassionate', 478, 356, 689),
('When I Don''t Know What to Pray', 'Holy Spirit, I come in weakness, not knowing how or what to pray. But You know. Intercede for me with groans too deep for words. Search my heart and align my prayers with God''s perfect will. Even my wordless longings are heard.', ARRAY['romans-8','holy-spirit','weakness','intercession','trust'], 'The Spirit himself intercedes for us through wordless groans. — Romans 8:26-27', 'approved', 'whisper', 412, 298, 567);
