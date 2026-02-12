-- Fix volunteer_signups table access for filtering
-- This allows all authenticated users to view volunteer signups so they can filter contacts properly

-- Drop the restrictive policy that only allows viewing signups for events you own
DROP POLICY IF EXISTS "Users can view volunteer signups for events they own or have access to" ON volunteer_signups;

-- Create a more permissive policy that allows all authenticated users to view volunteer signups
-- This is needed for the Contacts page filtering to work properly
CREATE POLICY "Authenticated users can view all volunteer signups for filtering" ON volunteer_signups
  FOR SELECT USING (auth.role() = 'authenticated');

-- Keep the existing restrictive policies for INSERT/UPDATE/DELETE operations
-- These ensure users can only modify signups for events they have access to

-- Add comment explaining the permissive access
COMMENT ON POLICY "Authenticated users can view all volunteer signups for filtering" ON volunteer_signups IS 'Allows all authenticated users to view volunteer signups for contact filtering purposes';
