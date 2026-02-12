-- Ensure the handle_new_user function has proper access to the contacts table
-- This addresses any potential RLS bypass issues during user creation

-- Grant necessary permissions to the contacts table for the function
GRANT ALL ON contacts TO authenticated;
GRANT ALL ON contacts TO anon;

-- Also ensure the function can access the profiles table
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO anon;

-- Verify the function has the right permissions
ALTER FUNCTION handle_new_user() SECURITY DEFINER;

-- Add comment explaining the permissions
COMMENT ON TABLE contacts IS 'Contacts table with full public access and proper function permissions for automatic POC contact creation';
