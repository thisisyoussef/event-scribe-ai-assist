-- Clean up conflicting phone constraints
-- Keep only the global unique constraint needed for ON CONFLICT (phone) to work

-- Drop conflicting constraints and indexes
DROP INDEX IF EXISTS unique_user_phone_non_empty;
DROP INDEX IF EXISTS unique_user_phone_simple;
DROP INDEX IF EXISTS idx_contacts_phone;

-- Keep only the global unique constraint on phone
-- This ensures ON CONFLICT (phone) works correctly
DO $$
BEGIN
  -- Check if the global unique constraint exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'contacts_phone_unique' 
    AND conrelid = 'contacts'::regclass
  ) THEN
    RAISE NOTICE 'Global unique constraint on phone already exists';
  ELSE
    -- Create the global unique constraint if it doesn't exist
    ALTER TABLE contacts ADD CONSTRAINT contacts_phone_unique UNIQUE (phone);
    RAISE NOTICE 'Created global unique constraint on phone';
  END IF;
END$$;

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT contacts_phone_unique ON contacts IS 'Global unique constraint on phone to enable ON CONFLICT (phone) logic for POC account creation';
