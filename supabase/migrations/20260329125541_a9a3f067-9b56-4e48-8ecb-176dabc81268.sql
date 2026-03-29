DROP POLICY IF EXISTS "Anyone can view prayed count" ON prayed_actions;

CREATE POLICY "Authenticated users can view own prayed actions"
  ON prayed_actions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);