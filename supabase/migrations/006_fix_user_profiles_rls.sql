-- Fix RLS policy for user_profiles to allow profile creation during signup
-- The issue: during signup with email confirmation, auth.uid() is NULL because user isn't authenticated yet
-- Solution: Allow inserts when the ID being inserted exists in auth.users (even if not confirmed)

-- Drop the old restrictive insert policy
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

-- Create a new policy that allows inserting profiles for newly created auth users
-- This checks if a user exists in auth.users with the same ID, even if not confirmed
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = user_profiles.id
    )
  );

-- Also update the select policy to allow users to view their own profile even before confirmation
-- This is needed for the email confirmation flow
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;

CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = user_profiles.id
      AND auth.users.email = user_profiles.email
    )
  );
