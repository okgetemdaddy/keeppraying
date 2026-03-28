
-- Update logs table for "Bless the fruit of our labor" section
CREATE TABLE public.update_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.update_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view update logs"
  ON public.update_logs FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can manage update logs"
  ON public.update_logs FOR ALL
  TO public
  USING (has_role(auth.uid(), 'admin'));

-- Feedback submissions table
CREATE TABLE public.feedback_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  feedback_type text NOT NULL DEFAULT 'feature_request',
  title text,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own feedback"
  ON public.feedback_submissions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own feedback"
  ON public.feedback_submissions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all feedback"
  ON public.feedback_submissions FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Donations tracking table
CREATE TABLE public.donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  stripe_session_id text,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  donation_type text NOT NULL DEFAULT 'one_time',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own donations"
  ON public.donations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage donations"
  ON public.donations FOR ALL
  TO public
  USING (auth.role() = 'service_role');

CREATE POLICY "Admins can view all donations"
  ON public.donations FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Add donor tracking columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_donor boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_founder boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS first_donated_at timestamptz;

-- Insert initial update log entries
INSERT INTO public.update_logs (description, created_at) VALUES
  ('🙏 KeepPray.ing launched — Glory to God! The digital prayer closet opens its doors to believers worldwide.', '2025-01-15T00:00:00Z'),
  ('✨ Prayer Board with customizable themes and ambient worship sounds — creating sacred spaces for your prayers.', '2025-02-01T00:00:00Z'),
  ('🔥 Prayer Streaks and War Room — faithful consistency tracked and celebrated. Press in daily!', '2025-03-01T00:00:00Z'),
  ('🤖 PrayerAssist AI launched — let the Spirit guide your prayers with AI-crafted encouragement and Scripture.', '2025-04-01T00:00:00Z'),
  ('👨‍👩‍👧‍👦 Family Prayer Rooms, Groups & Accountability Circles — pray together, grow together. Community is strength!', '2025-05-01T00:00:00Z'),
  ('🌍 Pray the World map — intercede for nations in real-time. Your prayers are covering the earth!', '2025-06-01T00:00:00Z'),
  ('📖 SermonSync & Bible Games — deepen your walk with interactive Scripture engagement. Hallelujah!', '2025-07-01T00:00:00Z'),
  ('💛 Support Us page — transparent giving with Founder status for early supporters. Thank you for sowing into the Kingdom!', now())
ON CONFLICT DO NOTHING;
