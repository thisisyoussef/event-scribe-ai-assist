-- Fix function permissions to ensure handle_new_user can bypass RLS
-- This addresses the 403/500 errors during user signup

-- Drop and recreate the handle_new_user function with proper permissions
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_phone TEXT;
  user_name TEXT;
  user_gender TEXT;
BEGIN
  -- Extract user data from metadata
  user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);
  user_phone := NEW.raw_user_meta_data->>'phone';
  user_gender := NEW.raw_user_meta_data->>'gender';
  
  -- Create profile entry (this should work with existing policies)
  INSERT INTO profiles (id, email, full_name, gender)
  VALUES (NEW.id, NEW.email, user_name, user_gender)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    gender = EXCLUDED.gender,
    updated_at = NOW();
  
  -- Only create contact if we have essential information
  IF user_name IS NOT NULL AND user_name != '' THEN
    -- Auto-create POC contact entry
    -- Use SECURITY DEFINER to bypass RLS for this operation
    INSERT INTO contacts (
      user_id,
      name,
      phone,
      gender,
      source,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      user_name,
      COALESCE(user_phone, ''),
      user_gender,
      'manual',
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id, phone) DO UPDATE SET
      name = EXCLUDED.name,
      gender = EXCLUDED.gender,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Ensure the function has the right permissions
ALTER FUNCTION handle_new_user() SECURITY DEFINER;

-- Grant necessary permissions to the function
GRANT EXECUTE ON FUNCTION handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user() TO anon;

-- Add comment explaining the security model
COMMENT ON FUNCTION handle_new_user() IS 'Enhanced function that creates profile entries and automatically creates POC contact entries. Uses SECURITY DEFINER to bypass RLS during user creation.';
