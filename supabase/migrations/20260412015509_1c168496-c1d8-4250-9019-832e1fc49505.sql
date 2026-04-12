-- Add warrior columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN is_prayer_warrior boolean NOT NULL DEFAULT false,
ADD COLUMN warrior_status text NOT NULL DEFAULT 'offline';

-- Create an index for finding available warriors
CREATE INDEX idx_profiles_warrior_available 
ON public.profiles (is_prayer_warrior, warrior_status) 
WHERE is_prayer_warrior = true;