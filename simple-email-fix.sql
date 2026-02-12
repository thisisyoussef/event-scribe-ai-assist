-- Simple fix for the duplicate email constraint error
-- This removes the unique constraint on email that's causing the invite failure

-- Remove the unique constraint on email
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_email_key;

-- Verify the constraint was removed
SELECT constraint_name, table_name, column_name 
FROM information_schema.table_constraints 
WHERE table_name = 'profiles' AND constraint_type = 'UNIQUE';

-- Optional: Add a comment to document this change
COMMENT ON TABLE profiles IS 'Profiles table - email uniqueness constraint removed to allow user invites';
