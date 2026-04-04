ALTER TABLE public.profiles ADD COLUMN subscription_tier text NOT NULL DEFAULT 'free';
UPDATE public.profiles SET subscription_tier = 'premium' WHERE is_founder = true;