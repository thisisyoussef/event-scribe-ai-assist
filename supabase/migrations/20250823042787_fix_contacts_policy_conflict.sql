-- Fix contacts policy conflict by creating a comprehensive policy
-- This replaces the restrictive "Users can view their own contacts" policy

-- Drop the restrictive policy that only allows users to see their own contacts
DROP POLICY IF EXISTS "Users can view their own contacts" ON contacts;

-- Drop the existing comprehensive policy to recreate it
DROP POLICY IF EXISTS "Authenticated users can view all contacts" ON contacts;

-- Create a comprehensive policy that allows authenticated users to view all contacts
-- while maintaining the ability to manage their own contacts
CREATE POLICY "Authenticated users can view all contacts" ON contacts
  FOR SELECT USING (
    auth.role() = 'authenticated'
  );

-- The existing policies for INSERT, UPDATE, DELETE remain unchanged
-- Users can still only modify their own contacts
