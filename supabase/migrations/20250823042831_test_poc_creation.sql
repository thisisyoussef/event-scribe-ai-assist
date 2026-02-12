-- Test POC account creation flow
-- This will help us verify if the handle_new_user function is working

-- First, let's check if the trigger is properly set up
DO $$
BEGIN
  RAISE NOTICE '=== CHECKING TRIGGER SETUP ===';
  
  -- Check if the trigger exists
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created' 
    AND tgrelid = 'auth.users'::regclass
  ) THEN
    RAISE NOTICE 'Trigger on_auth_user_created exists on auth.users';
  ELSE
    RAISE NOTICE 'WARNING: Trigger on_auth_user_created does NOT exist on auth.users';
  END IF;
  
  -- Check if the function exists
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'handle_new_user'
  ) THEN
    RAISE NOTICE 'Function handle_new_user exists';
  ELSE
    RAISE NOTICE 'WARNING: Function handle_new_user does NOT exist';
  END IF;
END$$;

-- Test the phone number conflict resolution logic
DO $$
BEGIN
  RAISE NOTICE '=== TESTING PHONE CONFLICT RESOLUTION ===';
  
  -- Try to insert a contact that should conflict with an existing one
  -- This will test if ON CONFLICT (phone) is working
  BEGIN
    INSERT INTO contacts (name, phone, email, gender, source, user_id, role)
    VALUES (
      'Test Conflict Resolution', 
      '+13134420000',  -- This phone exists in the database
      'test@example.com', 
      'brother', 
      'account_signup', 
      '00000000-0000-0000-0000-000000000000',  -- Dummy user ID
      'poc'
    )
    ON CONFLICT (phone) DO UPDATE SET
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      gender = EXCLUDED.gender,
      role = 'poc',
      source = 'account_signup',
      user_id = EXCLUDED.user_id,
      updated_at = NOW();
      
    RAISE NOTICE 'Phone conflict resolution test: SUCCESS - Contact was updated';
    
    -- Clean up the test
    DELETE FROM contacts WHERE user_id = '00000000-0000-0000-0000-000000000000';
    RAISE NOTICE 'Test contact cleaned up';
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Phone conflict resolution test: FAILED - %', SQLERRM;
  END;
END$$;

-- Check the current state of contacts
DO $$
DECLARE
  contact_record RECORD;
BEGIN
  RAISE NOTICE '=== CURRENT CONTACTS STATE ===';
  FOR contact_record IN 
    SELECT id, name, phone, email, source, role, user_id, created_at 
    FROM contacts 
    ORDER BY created_at DESC 
    LIMIT 3
  LOOP
    RAISE NOTICE 'Contact: ID=%, Name=%, Phone=%, Email=%, Source=%, Role=%, UserID=%, Created=%', 
      contact_record.id, 
      contact_record.name, 
      contact_record.phone, 
      contact_record.email, 
      contact_record.source, 
      contact_record.role, 
      contact_record.user_id, 
      contact_record.created_at;
  END LOOP;
END$$;
