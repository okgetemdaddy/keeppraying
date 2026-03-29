
-- Fix 1: Restrict profiles SELECT to authenticated users only (prevents anon enumeration of emails/roles)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;

-- Authenticated users can see all profiles (needed for social features: comments, groups, etc.)
CREATE POLICY "Authenticated users can view profiles"
  ON profiles FOR SELECT TO authenticated
  USING (true);

-- Fix 2: Add message length constraint on contact_submissions
ALTER TABLE contact_submissions
  ADD CONSTRAINT contact_message_length CHECK (length(message) <= 5000);
