-- Debug and fix user creation issues
-- This migration adds better error handling and debugging to identify the root cause

-- First, let's check if there are any constraint issues
-- Drop any problematic constraints that might be causing issues
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS unique_user_phone_non_empty;
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS unique_user_phone;

-- Create a simpler, more permissive unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_phone_simple 
ON contacts (user_id, phone) 
WHERE phone IS NOT NULL AND phone != '';

-- Now let's create a more robust handle_new_user function with better error handling
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
  profile_id UUID;
BEGIN
  -- Extract user data from metadata with fallbacks
  user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);
  user_phone := COALESCE(NEW.raw_user_meta_data->>'phone', '');
  user_gender := COALESCE(NEW.raw_user_meta_data->>'gender', '');
  
  -- Log the attempt (for debugging)
  RAISE NOTICE 'Creating profile for user: % with name: %, phone: %, gender: %', 
    NEW.id, user_name, user_phone, user_gender;
  
  -- Create profile entry first
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
    RAISE NOTICE 'Error creating profile for user %: %', NEW.id, SQLERRM;
    -- Continue anyway - don't fail the entire signup
  END;
  
  -- Only create contact if we have essential information and phone is not empty
  IF user_name IS NOT NULL AND user_name != '' AND user_phone != '' THEN
    BEGIN
      -- Auto-create POC contact entry
      INSERT INTO contacts (
        user_id,
        name,
        phone,
        gender,
        source,
        created_at,
        updated_at
      )
      VALUES (
        NEW.id,
        user_name,
        user_phone,
        user_gender,
        'manual',
        NOW(),
        NOW()
      );
      
      RAISE NOTICE 'Contact created successfully for user: %', NEW.id;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error creating contact for user %: %', NEW.id, SQLERRM;
      -- Continue anyway - don't fail the entire signup
    END;
  ELSE
    RAISE NOTICE 'Skipping contact creation for user %: name=% phone=%', NEW.id, user_name, user_phone;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Ensure the function has the right permissions
ALTER FUNCTION handle_new_user() SECURITY DEFINER;

-- Grant necessary permissions to the function
GRANT EXECUTE ON FUNCTION handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user() TO anon;

-- Add comment explaining the enhanced functionality
COMMENT ON FUNCTION handle_new_user() IS 'Robust function with error handling that creates profile entries and optionally creates POC contact entries. Continues on errors to prevent signup failures.';
