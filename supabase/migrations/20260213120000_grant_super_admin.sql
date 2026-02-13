-- Grant super-admin permissions to youssefiahmedis@gmail.com
-- This ensures the user has is_admin = true in the profiles table

UPDATE profiles
SET is_admin = true, updated_at = now()
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'youssefiahmedis@gmail.com'
);
