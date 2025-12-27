-- Add clever_id column for Clever SSO integration
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS clever_id TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_clever_id ON user_profiles(clever_id);

-- Add comment
COMMENT ON COLUMN user_profiles.clever_id IS 'Clever SSO user ID for single sign-on authentication';
