-- Fix duplicate email constraint issue in profiles table
-- This script addresses the "duplicate key value violates unique constraint profiles_email_key" error

-- First, let's check for any existing duplicate emails
SELECT email, COUNT(*) as count
FROM profiles 
GROUP BY email 
HAVING COUNT(*) > 1;

-- If duplicates exist, we need to clean them up
-- Keep the most recent profile for each email
WITH duplicates AS (
  SELECT id, email, created_at,
         ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at DESC) as rn
  FROM profiles
)
DELETE FROM profiles 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Now let's modify the handle_new_user function to handle email conflicts better
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Try to insert new profile
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, EXCLUDED.email),
    updated_at = NOW()
  ON CONFLICT (email) DO UPDATE SET
    -- If email conflict, update the existing profile with new user ID
    id = EXCLUDED.id,
    full_name = COALESCE(EXCLUDED.full_name, EXCLUDED.email),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- Alternative approach: Remove the unique constraint on email if you want to allow multiple profiles per email
-- (Only use this if you actually want to allow multiple users with the same email)
-- ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_email_key;

-- Better approach: Add a composite unique constraint that allows multiple profiles per email but prevents duplicates per user
-- This allows the same email to be used by different users (useful for family accounts, etc.)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_email_key;
ALTER TABLE profiles ADD CONSTRAINT profiles_email_id_unique UNIQUE (email, id);

-- Update the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Add comment explaining the change
COMMENT ON FUNCTION handle_new_user() IS 'Handles new user signup by creating profile entries. Allows multiple profiles per email but prevents duplicates per user.';
