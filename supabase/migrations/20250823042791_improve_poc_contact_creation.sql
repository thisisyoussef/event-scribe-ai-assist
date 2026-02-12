-- Improve POC contact creation with better phone number handling
-- This ensures POC contacts are created even if phone number is missing

-- Update the handle_new_user function to handle missing phone numbers better
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
  
  -- Create profile entry
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

-- Add comment explaining the improved functionality
COMMENT ON FUNCTION handle_new_user() IS 'Enhanced function that creates profile entries and automatically creates POC contact entries with better data handling';
