-- Clean up contacts policies to avoid conflicts
-- This ensures proper access control for contacts including auto-created POC contacts

-- Drop all existing contacts policies to start fresh
DROP POLICY IF EXISTS "Users can view their own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can insert their own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can update their own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can delete their own contacts" ON contacts;
DROP POLICY IF EXISTS "Authenticated users can view all contacts" ON contacts;
DROP POLICY IF EXISTS "Public can view POC contacts for published events" ON contacts;

-- Create comprehensive policies for contacts
-- 1. All authenticated users can view all contacts (for POC management)
CREATE POLICY "Authenticated users can view all contacts" ON contacts
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

-- Add comment explaining the policy structure
COMMENT ON TABLE contacts IS 'Contacts table with automatic POC contact creation and comprehensive access control';
