-- Fix the missing unique constraint on phone column
-- This is needed for the ON CONFLICT logic to work properly

-- First, let's check what constraints exist on the contacts table
DO $$
BEGIN
  RAISE NOTICE 'Checking existing constraints on contacts table...';
  
  -- Check for unique constraints
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_phone_non_empty' 
    AND conrelid = 'contacts'::regclass
  ) THEN
    RAISE NOTICE 'Unique constraint unique_phone_non_empty exists';
  ELSE
    RAISE NOTICE 'Unique constraint unique_phone_non_empty does NOT exist';
  END IF;
  
  -- Check for unique indexes
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'unique_phone_non_empty'
  ) THEN
    RAISE NOTICE 'Unique index unique_phone_non_empty exists';
  ELSE
    RAISE NOTICE 'Unique index unique_phone_non_empty does NOT exist';
  END IF;
END $$;

-- Create the unique constraint if it doesn't exist
DO $$
BEGIN
  -- Try to create unique index first
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'unique_phone_non_empty'
  ) THEN
    BEGIN
      CREATE UNIQUE INDEX unique_phone_non_empty ON contacts (phone) WHERE phone IS NOT NULL AND phone != '';
      RAISE NOTICE 'Created unique index unique_phone_non_empty';
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error creating unique index: %', SQLERRM;
    END;
  END IF;
  
  -- Also try to add a unique constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'contacts_phone_unique' 
    AND conrelid = 'contacts'::regclass
  ) THEN
    BEGIN
      ALTER TABLE contacts ADD CONSTRAINT contacts_phone_unique UNIQUE (phone);
      RAISE NOTICE 'Added unique constraint contacts_phone_unique';
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error adding unique constraint: %', SQLERRM;
    END;
  END IF;
END $$;

-- Test the constraint by trying to insert a duplicate
DO $$
BEGIN
  RAISE NOTICE 'Testing unique constraint...';
  
  -- Try to insert a test contact
  BEGIN
    INSERT INTO contacts (name, phone, email, gender, source, user_id) 
    VALUES ('TEST_USER_1', '+1234567890', 'test1@test.com', 'brother', 'test', '00000000-0000-0000-0000-000000000000');
    RAISE NOTICE 'Successfully inserted first test contact';
    
    -- Try to insert another with same phone (should fail)
    BEGIN
      INSERT INTO contacts (name, phone, email, gender, source, user_id) 
      VALUES ('TEST_USER_2', '+1234567890', 'test2@test.com', 'brother', 'test', '00000000-0000-0000-0000-000000000000');
      RAISE WARNING 'ERROR: Should have failed due to duplicate phone';
    EXCEPTION WHEN unique_violation THEN
      RAISE NOTICE 'SUCCESS: Duplicate phone correctly rejected';
    END;
    
    -- Clean up test data
    DELETE FROM contacts WHERE phone = '+1234567890';
    RAISE NOTICE 'Successfully cleaned up test contacts';
    
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error during constraint test: %', SQLERRM;
  END;
END $$;
