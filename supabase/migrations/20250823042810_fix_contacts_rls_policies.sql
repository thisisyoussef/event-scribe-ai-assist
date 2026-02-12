-- Fix contacts RLS policies to ensure proper access
-- This should resolve the 406 error when accessing contacts

-- Drop existing policies to recreate them cleanly
DROP POLICY IF EXISTS "Enable read access for all users" ON contacts;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON contacts;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON contacts;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON contacts;

-- Create comprehensive RLS policies for contacts
-- Allow public read access to all contacts
CREATE POLICY "Enable read access for all users" ON contacts
  FOR SELECT USING (true);

-- Allow authenticated users to insert contacts
CREATE POLICY "Enable insert for authenticated users only" ON contacts
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow users to update contacts they created
CREATE POLICY "Enable update for users based on user_id" ON contacts
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to delete contacts they created
CREATE POLICY "Enable delete for users based on user_id" ON contacts
  FOR DELETE USING (auth.uid() = user_id);

-- Ensure RLS is enabled
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
