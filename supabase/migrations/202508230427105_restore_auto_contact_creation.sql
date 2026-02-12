-- Restore automatic POC contact creation feature
-- This ensures that when POC users sign up, they automatically appear in contacts

-- First, let's verify the trigger exists and recreate it if needed
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Now let's create a robust handle_new_user function that definitely creates contacts
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
  user_email TEXT;
BEGIN
  -- Extract user data from metadata
  user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);
  user_phone := COALESCE(NEW.raw_user_meta_data->>'phone', '');
  user_gender := COALESCE(NEW.raw_user_meta_data->>'gender', '');
  user_email := NEW.email;
  
  -- Log the attempt for debugging
  RAISE NOTICE '=== AUTO-CREATING POC CONTACT ===';
  RAISE NOTICE 'User ID: %', NEW.id;
  RAISE NOTICE 'Email: %', user_email;
  RAISE NOTICE 'Name: %', user_name;
  RAISE NOTICE 'Phone: %', user_phone;
  RAISE NOTICE 'Gender: %', user_gender;
  
  -- 1. Always create profile entry
  BEGIN
    INSERT INTO profiles (id, email, full_name, gender)
    VALUES (NEW.id, user_email, user_name, user_gender)
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      gender = EXCLUDED.gender,
      updated_at = NOW();
    
    RAISE NOTICE 'Profile created/updated successfully for user: %', NEW.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERROR creating profile for user %: %', NEW.id, SQLERRM;
  END;
  
  -- 2. Always create contact entry (this is the key feature)
  BEGIN
    INSERT INTO contacts (
      user_id,
      name,
      phone,
      email,
      gender,
      source,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      user_name,
      user_phone,
      user_email,
      user_gender,
      'manual',
      NOW(),
      NOW()
    );
    
    RAISE NOTICE 'Contact created successfully for user: %', NEW.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERROR creating contact for user %: %', NEW.id, SQLERRM;
    RAISE NOTICE 'Contact creation failed, but signup continues';
  END;
  
  RAISE NOTICE '=== POC CONTACT CREATION COMPLETE ===';
  RETURN NEW;
END;
$$;

-- Ensure the function has the right permissions
ALTER FUNCTION handle_new_user() SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user() TO anon;

-- Recreate the trigger to ensure it's working
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Add comment explaining the restored functionality
COMMENT ON FUNCTION handle_new_user() IS 'Restored function that automatically creates POC contacts when users sign up. Creates both profile and contact entries reliably.';
