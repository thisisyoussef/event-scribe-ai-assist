-- Allow POCs (authenticated users) to update contacts
-- This resolves the 406 Not Acceptable error when upgrading a volunteer to POC

-- Ensure RLS is enabled
ALTER TABLE IF EXISTS public.contacts ENABLE ROW LEVEL SECURITY;

-- Grant UPDATE privilege to authenticated users
GRANT UPDATE ON TABLE public.contacts TO authenticated;

-- Drop existing update policies to avoid conflicts
DROP POLICY IF EXISTS "allow_authenticated_update_contacts" ON public.contacts;
DROP POLICY IF EXISTS "contacts_update_authenticated" ON public.contacts;

-- Create permissive update policy for authenticated users
CREATE POLICY "contacts_update_authenticated" ON public.contacts
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "contacts_update_authenticated" ON public.contacts 
  IS 'Authenticated users (POCs) can update any contact.';
