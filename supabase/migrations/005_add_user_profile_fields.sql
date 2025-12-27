-- Add additional fields to user_profiles table
ALTER TABLE user_profiles
ADD COLUMN first_name TEXT,
ADD COLUMN last_name TEXT,
ADD COLUMN birth_date DATE;

-- Update the user_profiles table to make first_name and last_name required for new users
-- (existing users can have NULL, but we'll require them on signup)
