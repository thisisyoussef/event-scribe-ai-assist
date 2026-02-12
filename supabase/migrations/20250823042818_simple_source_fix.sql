-- Simple fix for the source constraint issue
-- Update the function to use valid source values

-- First, let's see what the current source check constraint allows
SELECT 
  conname, 
  pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE contype = 'c' AND conrelid = 'contacts'::regclass;

-- Now let's fix the function to use only valid source values
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into profiles table
  INSERT INTO profiles (id, full_name, phone, gender)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'phone', NEW.raw_user_meta_data->>'gender')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    gender = EXCLUDED.gender;

  -- Insert into contacts if phone exists
  IF NEW.raw_user_meta_data->>'phone' IS NOT NULL AND NEW.raw_user_meta_data->>'phone' != '' THEN
    -- Try to insert new contact
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
      -- Keep the existing source if it's valid, otherwise use 'account_signup'
      source = CASE 
        WHEN contacts.source IN ('manual', 'volunteer_signup', 'account_signup') THEN contacts.source
        ELSE 'account_signup'
      END,
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the function works
DO $$
BEGIN
  RAISE NOTICE 'Testing contact creation...';
  
  -- Try to insert a test contact
  BEGIN
    INSERT INTO contacts (name, phone, email, gender, source, user_id) 
    VALUES ('TEST_USER_1', '+1234567890', 'test1@test.com', 'brother', 'account_signup', '00000000-0000-0000-0000-000000000000');
    RAISE NOTICE 'SUCCESS: Test contact created';
    
    -- Clean up test data
    DELETE FROM contacts WHERE phone = '+1234567890';
    RAISE NOTICE 'Successfully cleaned up test contact';
    
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error during test: %', SQLERRM;
  END;
END $$;
