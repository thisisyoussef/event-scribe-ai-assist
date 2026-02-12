-- Relax contacts delete policy to allow all authenticated users to delete any contact
-- This aligns with the UI requirement to manage shared contacts collaboratively

-- Ensure RLS is enabled
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Drop specific delete policy if it exists
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON contacts;

-- Create permissive delete policy for authenticated users
CREATE POLICY "Authenticated users can delete any contact" ON contacts
  FOR DELETE USING (auth.role() = 'authenticated');

-- Optionally ensure read/insert/update policies remain intact or permissive
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'contacts' AND policyname = 'Enable read access for all users'
  ) THEN
    CREATE POLICY "Enable read access for all users" ON contacts FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'contacts' AND policyname = 'Enable insert for authenticated users only'
  ) THEN
    CREATE POLICY "Enable insert for authenticated users only" ON contacts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  END IF;

  -- Keep update limited to creator unless explicitly changed elsewhere
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'contacts' AND policyname = 'Enable update for users based on user_id'
  ) THEN
    CREATE POLICY "Enable update for users based on user_id" ON contacts FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END$$;


