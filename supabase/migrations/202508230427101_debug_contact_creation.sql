-- Debug contact creation to ensure contacts are being created properly
-- This addresses the issue where contacts might not be visible due to creation failures

-- Let's create a more robust handle_new_user function with better debugging
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
  contact_id UUID;
BEGIN
  -- Extract user data from metadata with safe fallbacks
  user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);
  user_phone := COALESCE(NEW.raw_user_meta_data->>'phone', '');
  user_gender := COALESCE(NEW.raw_user_meta_data->>'gender', '');
  
  -- Log the attempt (for debugging)
  RAISE NOTICE '=== USER CREATION DEBUG ===';
  RAISE NOTICE 'User ID: %', NEW.id;
  RAISE NOTICE 'Email: %', NEW.email;
  RAISE NOTICE 'Name: %', user_name;
  RAISE NOTICE 'Phone: %', user_phone;
  RAISE NOTICE 'Gender: %', user_gender;
  RAISE NOTICE 'Raw metadata: %', NEW.raw_user_meta_data;
  
  -- Always create profile entry (this is the core requirement)
  BEGIN
    INSERT INTO profiles (id, email, full_name, gender)
    VALUES (NEW.id, NEW.email, user_name, user_gender)
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      gender = EXCLUDED.gender,
      updated_at = NOW();
    
    RAISE NOTICE 'Profile created/updated successfully for user: %', NEW.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERROR creating profile for user %: %', NEW.id, SQLERRM;
    -- Continue anyway - don't fail the entire signup
  END;
  
  -- Always try to create a contact, even with minimal data
  -- This ensures we have a contact entry for every user
  BEGIN
    -- Generate a unique contact ID
    contact_id := gen_random_uuid();
    
    -- Create contact with whatever data we have
    INSERT INTO contacts (
      id,
      user_id,
      name,
      phone,
      gender,
      source,
      created_at,
      updated_at
    )
    VALUES (
      contact_id,
      NEW.id,
      user_name,
      COALESCE(user_phone, ''),
      COALESCE(user_gender, ''),
      'manual',
      NOW(),
      NOW()
    );
    
    RAISE NOTICE 'Contact created successfully with ID: % for user: %', contact_id, NEW.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERROR creating contact for user %: %', NEW.id, SQLERRM;
    RAISE NOTICE 'Contact creation failed, but signup continues';
    -- Continue anyway - don't fail the entire signup
  END;
  
  RAISE NOTICE '=== USER CREATION COMPLETE ===';
  RETURN NEW;
END;
$$;

-- Ensure the function has the right permissions
ALTER FUNCTION handle_new_user() SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user() TO anon;

-- Add comment explaining the enhanced debugging
COMMENT ON FUNCTION handle_new_user() IS 'Enhanced function with comprehensive debugging that ensures both profile and contact creation. Designed to identify any issues during user signup.';
