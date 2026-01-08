-- Add teacher profile fields to user_profiles

-- Display name shown to students
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Short bio/description
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS bio TEXT;

-- Whether the profile is discoverable by students
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS is_profile_public BOOLEAN DEFAULT false;

-- Index for finding public teacher profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_public_teachers
  ON user_profiles(user_type, is_profile_public)
  WHERE user_type = 'teacher' AND is_profile_public = true;

-- Allow anyone to read public teacher profiles
CREATE POLICY "Anyone can view public profiles" ON user_profiles
  FOR SELECT USING (is_profile_public = true);
