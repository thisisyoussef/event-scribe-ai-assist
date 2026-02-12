-- Make contacts truly public for all authenticated users
-- This ensures everyone has access to the same contact database

-- First, let's check what policies currently exist and drop any restrictive ones
DROP POLICY IF EXISTS "Users can view their own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can insert their own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can update their own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can delete their own contacts" ON contacts;
DROP POLICY IF EXISTS "Authenticated users can view all contacts" ON contacts;
DROP POLICY IF EXISTS "Public can view POC contacts for published events" ON contacts;
DROP POLICY IF EXISTS "Users can insert contacts" ON contacts;
DROP POLICY IF EXISTS "Users can update contacts" ON contacts;
DROP POLICY IF EXISTS "Users can delete contacts" ON contacts;

-- Now create comprehensive public policies for contacts
-- 1. ALL authenticated users can view ALL contacts (truly public)
CREATE POLICY "Public contacts view for all authenticated users" ON contacts
  FOR SELECT USING (auth.role() = 'authenticated');

-- 2. Users can insert contacts (including auto-created POC contacts)
CREATE POLICY "Users can insert contacts" ON contacts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Users can update their own contacts
CREATE POLICY "Users can update their own contacts" ON contacts
  FOR UPDATE USING (auth.uid() = user_id);

-- 4. Users can delete their own contacts
CREATE POLICY "Users can delete their own contacts" ON contacts
  FOR DELETE USING (auth.uid() = user_id);

-- Add comment explaining the public access
COMMENT ON TABLE contacts IS 'Contacts table with truly public access - all authenticated users can view all contacts for coordination purposes';
