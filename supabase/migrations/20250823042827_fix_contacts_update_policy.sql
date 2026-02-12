-- Fix contacts update policy to allow authenticated users to update any contact
-- This resolves the RLS restriction preventing contact updates

-- Ensure RLS is enabled
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Drop any restrictive update policies
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON contacts;
DROP POLICY IF EXISTS "Users can update their own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can update contacts" ON contacts;

-- Create a permissive update policy that allows any authenticated user to update contacts
CREATE POLICY "allow_authenticated_update_contacts"
  ON contacts
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Also ensure read access is public
DROP POLICY IF EXISTS "Enable read access for all users" ON contacts;
CREATE POLICY "Enable read access for all users" ON contacts FOR SELECT USING (true);

-- Add comment explaining the policy
COMMENT ON TABLE contacts IS 'Contacts table with permissive update policy for authenticated users';
