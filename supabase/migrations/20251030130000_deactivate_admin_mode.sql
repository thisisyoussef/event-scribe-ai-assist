-- Create function to deactivate admin mode
-- This allows admins to return to normal user status

CREATE OR REPLACE FUNCTION deactivate_admin_mode()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id UUID;
BEGIN
  -- Get current user ID
  user_id := auth.uid();
  
  IF user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Update profiles table to set is_admin to FALSE
  UPDATE public.profiles 
  SET is_admin = FALSE, updated_at = NOW()
  WHERE id = user_id;
  
  -- Update user metadata to remove is_admin flag
  UPDATE auth.users 
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) - 'is_admin'
  WHERE id = user_id;
  
  RETURN TRUE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION deactivate_admin_mode() TO authenticated;

COMMENT ON FUNCTION deactivate_admin_mode() IS 'Deactivate admin mode and return to normal user status';











