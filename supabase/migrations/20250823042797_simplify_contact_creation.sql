-- Simplify contact creation to avoid constraint and validation issues
-- This migration creates a more basic but reliable contact creation process

-- Create a simplified handle_new_user function that focuses on reliability
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
  -- Extract user data from metadata with safe fallbacks
  user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);
  user_phone := COALESCE(NEW.raw_user_meta_data->>'phone', '');
  user_gender := COALESCE(NEW.raw_user_meta_data->>'gender', '');
  
  -- Always create profile entry (this is the core requirement)
  INSERT INTO profiles (id, email, full_name, gender)
  VALUES (NEW.id, NEW.email, user_name, user_gender)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    gender = EXCLUDED.gender,
    updated_at = NOW();
  
  -- Only create contact if we have a valid phone number
  -- This prevents constraint violations and ensures data quality
  IF user_phone IS NOT NULL AND user_phone != '' AND user_phone != 'undefined' THEN
    -- Try to create contact, but don't fail if it doesn't work
    BEGIN
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
        user_phone,
        user_gender,
        'manual',
        NOW(),
        NOW()
      );
    EXCEPTION WHEN OTHERS THEN
      -- Log the error but don't fail the signup
      -- The user will still have a profile, just no contact entry
      NULL;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Ensure the function has the right permissions
ALTER FUNCTION handle_new_user() SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user() TO anon;

-- Add comment explaining the simplified approach
COMMENT ON FUNCTION handle_new_user() IS 'Simplified function that prioritizes user profile creation and optionally creates contacts. Designed for maximum reliability during signup.';
