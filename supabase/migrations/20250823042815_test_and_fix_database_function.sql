-- Test and fix the database function
-- Let's verify the current state and fix any issues

-- First, let's check what's currently in the database
DO $$
BEGIN
  RAISE NOTICE 'Checking current function state...';
  
  -- Check if function exists
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user') THEN
    RAISE NOTICE 'Function handle_new_user exists';
  ELSE
    RAISE NOTICE 'Function handle_new_user does NOT exist';
  END IF;
  
  -- Check if trigger exists
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    RAISE NOTICE 'Trigger on_auth_user_created exists';
  ELSE
    RAISE NOTICE 'Trigger on_auth_user_created does NOT exist';
  END IF;
END $$;

-- Let's also check if there are any permission issues with the contacts table
DO $$
BEGIN
  -- Check if we can insert into contacts
  BEGIN
    INSERT INTO contacts (name, phone, email, gender, source, user_id) 
    VALUES ('TEST_USER', '+1234567890', 'test@test.com', 'brother', 'test', '00000000-0000-0000-0000-000000000000')
    ON CONFLICT (phone) DO NOTHING;
    RAISE NOTICE 'Successfully inserted test contact';
    
    -- Clean up test data
    DELETE FROM contacts WHERE phone = '+1234567890';
    RAISE NOTICE 'Successfully cleaned up test contact';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error testing contacts table: %', SQLERRM;
  END;
END $$;

-- Now let's recreate the function with proper error handling and logging
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  debug_info TEXT;
BEGIN
  -- Log the function call
  debug_info := format('User ID: %s, Email: %s, Phone: %s', 
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'phone', 'NULL')
  );
  
  RAISE LOG 'handle_new_user called: %', debug_info;
  
  -- Insert into profiles table
  BEGIN
    INSERT INTO profiles (id, full_name, phone, gender)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'phone', NEW.raw_user_meta_data->>'gender')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      phone = EXCLUDED.phone,
      gender = EXCLUDED.gender;
    
    RAISE LOG 'Profile created/updated successfully for user: %', NEW.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error creating profile: %', SQLERRM;
  END;

  -- Insert into contacts if phone exists
  IF NEW.raw_user_meta_data->>'phone' IS NOT NULL AND NEW.raw_user_meta_data->>'phone' != '' THEN
    BEGIN
      INSERT INTO contacts (name, phone, email, gender, source, user_id)
      VALUES (
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        NEW.raw_user_meta_data->>'phone',
        COALESCE(NEW.email, ''),
        COALESCE(NEW.raw_user_meta_data->>'gender', ''),
        'account_signup',
        NEW.id
      )
      ON CONFLICT (phone) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        email = COALESCE(EXCLUDED.email, contacts.email),
        source = CASE 
          WHEN contacts.source = 'manual' THEN 'manual_and_account'
          WHEN contacts.source = 'volunteer_signup' THEN 'volunteer_and_account'
          ELSE EXCLUDED.source
        END,
        updated_at = NOW();
      
      RAISE LOG 'Contact created/updated successfully for user: % with phone: %', NEW.id, NEW.raw_user_meta_data->>'phone';
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error creating contact: %', SQLERRM;
    END;
  ELSE
    RAISE LOG 'No phone number provided for user: %, skipping contact creation', NEW.id;
  END IF;

  RAISE LOG 'handle_new_user completed successfully for user: %', NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists and is properly configured
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user() TO anon;

-- Verify the function was created
SELECT 
  proname, 
  prosrc 
FROM pg_proc 
WHERE proname = 'handle_new_user';
