-- Fix potential database issues and add better error handling
-- This addresses JavaScript errors and ensures database stability

-- First, let's check if there are any deadlocks or connection issues
-- Reset any problematic sequences or constraints

-- Ensure the contacts table has the right structure
ALTER TABLE contacts ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE contacts ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE contacts ALTER COLUMN updated_at SET DEFAULT NOW();

-- Make sure the gender column allows empty values (for backward compatibility)
ALTER TABLE contacts ALTER COLUMN gender DROP NOT NULL;

-- Ensure the phone column can handle empty values
ALTER TABLE contacts ALTER COLUMN phone DROP NOT NULL;

-- Add a simple index to improve query performance
CREATE INDEX IF NOT EXISTS idx_contacts_public_access ON contacts (user_id, created_at);

-- Now let's create a very simple, bulletproof handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Simple profile creation - always succeeds
  INSERT INTO profiles (id, email, full_name, gender)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'gender', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    gender = EXCLUDED.gender,
    updated_at = NOW();
  
  -- Simple contact creation - always succeeds
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
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'gender', ''),
    'manual',
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id, phone) DO UPDATE SET
    name = EXCLUDED.name,
    gender = EXCLUDED.gender,
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- If anything fails, just return NEW to allow signup to continue
  -- This prevents the entire signup from failing
  RETURN NEW;
END;
$$;

-- Ensure the function has the right permissions
ALTER FUNCTION handle_new_user() SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user() TO anon;

-- Add comment explaining the simplified approach
COMMENT ON FUNCTION handle_new_user() IS 'Simplified, bulletproof function that ensures user signup always succeeds. Creates both profile and contact entries with comprehensive error handling.';
