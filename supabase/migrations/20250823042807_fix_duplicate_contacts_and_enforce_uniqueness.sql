-- Fix duplicate contacts and enforce phone uniqueness
-- This migration does both operations in the correct order

-- Step 1: Clean up duplicate contacts by phone number
-- Keep the first contact created for each phone number, delete the rest
WITH duplicates AS (
  SELECT 
    id,
    phone,
    ROW_NUMBER() OVER (PARTITION BY phone ORDER BY created_at) as rn
  FROM contacts 
  WHERE phone IS NOT NULL AND phone != ''
),
to_delete AS (
  SELECT id FROM duplicates WHERE rn > 1
)
DELETE FROM contacts 
WHERE id IN (SELECT id FROM to_delete);

-- Step 2: Create unique index on phone to enforce global uniqueness for non-empty phones
-- Note: This assumes phones are already normalized to E.164 in the app
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'unique_phone_non_empty'
  ) THEN
    CREATE UNIQUE INDEX unique_phone_non_empty ON contacts (phone) WHERE phone <> '';
    COMMENT ON INDEX unique_phone_non_empty IS 'Globally unique phone constraint (non-empty), prevents duplicates across all users.';
  END IF;
END $$;

-- Step 3: Update the handle_new_user function to prevent future duplicates
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

  -- Insert into contacts table, but only if no contact with this phone already exists
  -- This prevents duplicates when someone creates an account with a phone that's already in contacts
  IF NOT EXISTS (
    SELECT 1 FROM contacts WHERE phone = NEW.raw_user_meta_data->>'phone'
  ) THEN
    INSERT INTO contacts (name, phone, email, gender, source, user_id)
    VALUES (
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'phone',
      NEW.email,
      NEW.raw_user_meta_data->>'gender',
      'account_signup',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify cleanup
-- This should return 0 if no duplicates remain
SELECT COUNT(*) as remaining_duplicates
FROM (
  SELECT phone, COUNT(*) 
  FROM contacts 
  WHERE phone IS NOT NULL AND phone != '' 
  GROUP BY phone 
  HAVING COUNT(*) > 1
) as dupes;
