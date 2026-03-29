-- Fix 1: Testimonies - replace overly permissive SELECT with proper policies
DROP POLICY IF EXISTS "Anyone can view testimonies" ON testimonies;

CREATE POLICY "Public testimonies are viewable"
  ON testimonies FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can view own testimonies"
  ON testimonies FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Fix 2: Likes - restrict SELECT to authenticated users only
DROP POLICY IF EXISTS "Anyone can view likes" ON likes;

CREATE POLICY "Authenticated users can view likes"
  ON likes FOR SELECT
  TO authenticated
  USING (true);