-- Add email column to contacts table
-- This allows storing email addresses for contacts (especially POC contacts)

-- Add email column to contacts table
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Add index for email field to improve search performance
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);

-- Update the handle_new_user function to also capture email from user metadata
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
    email,
    gender,
    source,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    NEW.email, -- Use the user's email from auth
    COALESCE(NEW.raw_user_meta_data->>'gender', ''),
    'manual',
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id, phone) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
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

-- Add comment explaining the email field
COMMENT ON COLUMN contacts.email IS 'Email address for the contact (especially useful for POC contacts)';
COMMENT ON FUNCTION handle_new_user() IS 'Enhanced function that creates profile entries and automatically creates POC contact entries with email information.';
