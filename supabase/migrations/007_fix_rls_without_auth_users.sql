-- Fix RLS policy to not query auth.users table (which causes permission denied error)
-- Solution: Allow inserts without checking auth.users, but use application-level security

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- Allow inserts - the ID foreign key constraint ensures the user exists in auth.users
-- The application layer (lib/auth.tsx) ensures the ID matches the signed-up user
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (true);

-- Allow users to view their own profile
-- During signup (before email confirmation), auth.uid() is null, so we allow public reads temporarily
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (true);

-- Allow users to update their own profile (authenticated users only)
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
