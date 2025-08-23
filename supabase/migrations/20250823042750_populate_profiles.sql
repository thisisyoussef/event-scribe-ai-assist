-- Populate profiles table with existing auth users
-- This will ensure the profiles table has entries for all existing users

-- Insert profiles for existing auth users
INSERT INTO profiles (id, email, full_name, created_at, updated_at)
SELECT 
  id,
  email,
  COALESCE(
    raw_user_meta_data->>'full_name',
    raw_user_meta_data->>'name',
    email
  ) as full_name,
  created_at,
  updated_at
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  updated_at = EXCLUDED.updated_at;

-- Also ensure the current user has a profile if they're logged in
-- This is a fallback for any users that might have been missed
INSERT INTO profiles (id, email, full_name, created_at, updated_at)
SELECT 
  auth.uid(),
  auth.jwt() ->> 'email',
  COALESCE(
    auth.jwt() -> 'user_metadata' ->> 'full_name',
    auth.jwt() -> 'user_metadata' ->> 'name',
    auth.jwt() ->> 'email'
  ) as full_name,
  NOW(),
  NOW()
WHERE auth.uid() IS NOT NULL
ON CONFLICT (id) DO NOTHING;

