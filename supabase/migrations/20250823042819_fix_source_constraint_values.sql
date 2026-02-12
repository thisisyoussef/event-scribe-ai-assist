-- Fix the source constraint by checking what values are allowed
-- and updating the constraint if needed

-- First, let's see what the current source check constraint allows
DO $$
DECLARE
  constraint_def TEXT;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO constraint_def
  FROM pg_constraint 
  WHERE conname = 'contacts_source_check' AND conrelid = 'contacts'::regclass;
  
  RAISE NOTICE 'Current source check constraint: %', constraint_def;
END $$;

-- Let's also see what source values currently exist
SELECT DISTINCT source, COUNT(*) as count
FROM contacts 
GROUP BY source 
ORDER BY source;

-- Now let's drop the problematic constraint and recreate it with the right values
DO $$
BEGIN
  -- Drop the existing constraint
  ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_source_check;
  RAISE NOTICE 'Dropped existing contacts_source_check constraint';
  
  -- Add a new constraint with the correct values
  ALTER TABLE contacts ADD CONSTRAINT contacts_source_check 
    CHECK (source IN ('manual', 'volunteer_signup', 'account_signup', 'csv_import', 'poc_creation'));
  RAISE NOTICE 'Added new contacts_source_check constraint with valid values';
END $$;

-- Test the function now
DO $$
BEGIN
  RAISE NOTICE 'Testing contact creation after constraint fix...';
  
  -- Try to insert a test contact
  BEGIN
    INSERT INTO contacts (name, phone, email, gender, source, user_id) 
    VALUES ('TEST_USER_1', '+1234567890', 'test1@test.com', 'brother', 'account_signup', '00000000-0000-0000-0000-000000000000');
    RAISE NOTICE 'SUCCESS: Test contact created after constraint fix';
    
    -- Clean up test data
    DELETE FROM contacts WHERE phone = '+1234567890';
    RAISE NOTICE 'Successfully cleaned up test contact';
    
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error during test after constraint fix: %', SQLERRM;
  END;
END $$;
