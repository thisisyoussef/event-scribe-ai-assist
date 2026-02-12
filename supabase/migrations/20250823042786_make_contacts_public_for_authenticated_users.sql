-- Make contacts table public for any authenticated user
-- This allows anyone with an account to view all contacts

-- Add policy for authenticated users to view all contacts
CREATE POLICY "Authenticated users can view all contacts" ON contacts
  FOR SELECT USING (
    auth.role() = 'authenticated'
  );

-- Note: The existing policies for users to manage their own contacts remain in place
-- This new policy only affects SELECT operations and allows viewing
