-- Fix mutable search_path for activate_admin_mode
-- Ensures function runs with a fixed, safe search_path

-- Drop existing function (preserve signature)
DROP FUNCTION IF EXISTS activate_admin_mode(TEXT);

-- Recreate with explicit search_path and SECURITY DEFINER
CREATE OR REPLACE FUNCTION activate_admin_mode(admin_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    UPDATE public.profiles 
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
$$;

-- Restore permissions
GRANT EXECUTE ON FUNCTION activate_admin_mode(TEXT) TO authenticated;

COMMENT ON FUNCTION activate_admin_mode(TEXT) IS 'Activate admin mode with fixed search_path (public).';


