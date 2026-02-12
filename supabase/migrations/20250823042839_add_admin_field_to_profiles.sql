-- Add admin field to profiles table
-- This allows users to be elevated to admin status with higher privileges

-- Add admin column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Add admin column to auth.users metadata if it doesn't exist
-- This will be used to store admin status in user metadata

-- Create function to activate admin mode
CREATE OR REPLACE FUNCTION activate_admin_mode(admin_code TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_id UUID;
  is_valid_admin BOOLEAN;
BEGIN
  -- Get current user ID
  user_id := auth.uid();
  
  -- Check if admin code is valid (ADMINMODE)
  is_valid_admin := (admin_code = 'ADMINMODE');
  
  IF is_valid_admin THEN
    -- Update profiles table
    UPDATE profiles 
    SET is_admin = TRUE, updated_at = NOW()
    WHERE id = user_id;
    
    -- Update user metadata
    UPDATE auth.users 
    SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"is_admin": true}'::jsonb
    WHERE id = user_id;
    
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION activate_admin_mode(TEXT) TO authenticated;

-- Create RLS policy to allow users to update their own admin status
CREATE POLICY "Users can update own admin status" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Add comment
COMMENT ON COLUMN profiles.is_admin IS 'Whether the user has admin privileges';
COMMENT ON FUNCTION activate_admin_mode(TEXT) IS 'Function to activate admin mode with valid admin code';
