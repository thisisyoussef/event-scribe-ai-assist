-- Force contacts to be truly public by recreating RLS from scratch
-- This addresses the issue where contacts aren't visible across accounts

-- First, let's temporarily disable RLS to see if that's the issue
ALTER TABLE contacts DISABLE ROW LEVEL SECURITY;

-- Now let's check if we can see all contacts without RLS
-- If this works, we'll know RLS was the problem

-- Let's also verify the current policies are completely removed
DROP POLICY IF EXISTS "Public contacts view for all authenticated users" ON contacts;
DROP POLICY IF EXISTS "Users can insert contacts" ON contacts;
DROP POLICY IF EXISTS "Users can update their own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can delete their own contacts" ON contacts;

-- Now let's re-enable RLS and create the simplest possible public policy
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Create a single, simple policy that allows all authenticated users to do everything
-- This is the most permissive approach to ensure contacts are truly public
CREATE POLICY "Full public access for authenticated users" ON contacts
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Add comment explaining the permissive access
COMMENT ON TABLE contacts IS 'Contacts table with full public access - all authenticated users have complete access to all contacts';
