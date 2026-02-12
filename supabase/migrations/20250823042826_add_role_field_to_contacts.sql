-- Add role field to contacts table to distinguish POC contacts
-- This migration adds a role field to properly identify POC accounts vs regular contacts

-- Add role column to contacts table
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('poc', 'volunteer', 'admin')) DEFAULT 'volunteer';

-- Create index for role filtering
CREATE INDEX IF NOT EXISTS idx_contacts_role ON contacts(role);

-- Update the handle_new_user function to set role='poc' for POC accounts
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

  -- Only insert into contacts if the phone is not empty
  IF NEW.raw_user_meta_data->>'phone' IS NOT NULL AND NEW.raw_user_meta_data->>'phone' != '' THEN
    -- For POC accounts, we want to ensure they're in contacts with role='poc'
    -- If a contact already exists, update it to link to this user and set role='poc'
    -- If no contact exists, create a new one with role='poc'
    
    INSERT INTO contacts (name, phone, email, gender, source, user_id, role)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      NEW.raw_user_meta_data->>'phone',
      COALESCE(NEW.email, ''),
      COALESCE(NEW.raw_user_meta_data->>'gender', ''),
      'account_signup',
      NEW.id,
      'poc'  -- Set role to 'poc' for POC accounts
    )
    ON CONFLICT (phone) DO UPDATE SET
      -- Update existing contact to link it to this user account and set role='poc'
      name = COALESCE(EXCLUDED.name, contacts.name),  -- Update name if provided
      user_id = EXCLUDED.user_id,
      email = COALESCE(EXCLUDED.email, contacts.email),
      gender = COALESCE(EXCLUDED.gender, contacts.gender),  -- Update gender if provided
      role = 'poc',  -- Ensure role is set to 'poc' for POC accounts
      source = 'account_signup',  -- Use consistent source value
      updated_at = NOW();
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists and is working
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Add comment explaining the enhanced functionality
COMMENT ON COLUMN contacts.role IS 'Role of the contact: poc (Point of Contact), volunteer, or admin';
COMMENT ON FUNCTION handle_new_user() IS 'Enhanced function that creates POC contacts with proper role identification';

-- Ensure a permissive update policy so authenticated users can update contacts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'contacts' AND policyname = 'Enable update for users based on user_id'
  ) THEN
    -- Keep existing creator-only policy if present
    CREATE POLICY IF NOT EXISTS "Enable update for users based on user_id" ON contacts FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);
  END IF;

  -- Also add a permissive policy to allow any authenticated user to update contacts
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'contacts' AND policyname = 'Authenticated users can update any contact'
  ) THEN
    CREATE POLICY "Authenticated users can update any contact" ON contacts FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
  END IF;
END$$;
