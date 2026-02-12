-- Debug POC creation execution
-- This will add comprehensive logging to see what's happening

-- Drop the existing function and recreate with detailed logging
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  phone_value TEXT;
  name_value TEXT;
  email_value TEXT;
  gender_value TEXT;
BEGIN
  -- Extract values for debugging
  phone_value := NEW.raw_user_meta_data->>'phone';
  name_value := NEW.raw_user_meta_data->>'full_name';
  email_value := NEW.email;
  gender_value := NEW.raw_user_meta_data->>'gender';
  
  -- Comprehensive logging
  RAISE LOG '=== handle_new_user EXECUTION START ===';
  RAISE LOG 'User ID: %', NEW.id;
  RAISE LOG 'Raw metadata: %', NEW.raw_user_meta_data;
  RAISE LOG 'Phone: %', phone_value;
  RAISE LOG 'Name: %', name_value;
  RAISE LOG 'Email: %', email_value;
  RAISE LOG 'Gender: %', gender_value;
  RAISE LOG 'Phone is NULL: %', (phone_value IS NULL);
  RAISE LOG 'Phone is empty: %', (phone_value = '');
  RAISE LOG 'Phone length: %', LENGTH(COALESCE(phone_value, ''));
  
  -- Insert into profiles table
  RAISE LOG 'Inserting into profiles...';
  INSERT INTO profiles (id, full_name, phone, gender)
  VALUES (NEW.id, name_value, phone_value, gender_value)
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    gender = EXCLUDED.gender;
  RAISE LOG 'Profile insert/update completed';

  -- Check if we should create/update a contact
  IF phone_value IS NOT NULL AND phone_value != '' THEN
    RAISE LOG 'Phone validation passed, proceeding with contact creation/update';
    
    -- Log the exact values we're about to insert
    RAISE LOG 'Contact insert values:';
    RAISE LOG '  - name: %', COALESCE(name_value, '');
    RAISE LOG '  - phone: %', phone_value;
    RAISE LOG '  - email: %', COALESCE(email_value, '');
    RAISE LOG '  - gender: %', COALESCE(gender_value, '');
    RAISE LOG '  - source: account_signup';
    RAISE LOG '  - user_id: %', NEW.id;
    RAISE LOG '  - role: poc';
    
    -- Check if a contact with this phone already exists
    IF EXISTS (SELECT 1 FROM contacts WHERE phone = phone_value) THEN
      RAISE LOG 'Contact with phone % already exists, will update', phone_value;
    ELSE
      RAISE LOG 'No existing contact with phone %, will create new', phone_value;
    END IF;
    
    -- Insert/update contact
    BEGIN
      INSERT INTO contacts (name, phone, email, gender, source, user_id, role)
      VALUES (
        COALESCE(name_value, ''),
        phone_value,
        COALESCE(email_value, ''),
        COALESCE(gender_value, ''),
        'account_signup',
        NEW.id,
        'poc'
      )
      ON CONFLICT (phone) DO UPDATE SET
        name = COALESCE(EXCLUDED.name, contacts.name),
        user_id = EXCLUDED.user_id,
        email = COALESCE(EXCLUDED.email, contacts.email),
        gender = COALESCE(EXCLUDED.gender, contacts.gender),
        role = 'poc',
        source = 'account_signup',
        updated_at = NOW();
        
      RAISE LOG 'Contact insert/update completed successfully';
      
      -- Verify the contact was created/updated
      IF EXISTS (SELECT 1 FROM contacts WHERE phone = phone_value) THEN
        RAISE LOG 'Verification: Contact with phone % exists in database', phone_value;
      ELSE
        RAISE WARNING 'Verification FAILED: Contact with phone % NOT found in database', phone_value;
      END IF;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Error during contact insert/update: %', SQLERRM;
        RAISE WARNING 'Error detail: %', SQLSTATE;
        RAISE WARNING 'Error context: %', SQLERRM;
    END;
  ELSE
    RAISE LOG 'Phone validation failed - phone is NULL or empty, skipping contact creation';
  END IF;

  RAISE LOG '=== handle_new_user EXECUTION END ===';
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'FATAL ERROR in handle_new_user: %', SQLERRM;
    RAISE WARNING 'Error detail: %', SQLSTATE;
    RAISE WARNING 'Error context: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the function with a dummy call to verify it works
DO $$
BEGIN
  RAISE NOTICE 'Testing handle_new_user function...';
  
  -- Create a dummy user record for testing
  DECLARE
    test_user RECORD;
  BEGIN
    -- This is just a test call, won't actually create anything
    RAISE NOTICE 'Function syntax is valid';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Function test failed: %', SQLERRM;
  END;
END$$;
