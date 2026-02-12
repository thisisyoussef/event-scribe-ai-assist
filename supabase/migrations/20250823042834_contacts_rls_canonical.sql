-- Canonical RLS policies for contacts
-- Goal: everyone can view; any authenticated user can insert, update, delete

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Drop existing contacts policies to start clean
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'contacts'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.contacts', rec.policyname);
  END LOOP;
END$$;

-- 1) Allow all users to SELECT (make visible to anyone). If you want only authenticated, change USING(true) to auth.role() = 'authenticated'
CREATE POLICY "contacts_select_all"
  ON public.contacts
  FOR SELECT
  USING (true);

-- 2) Allow any authenticated user to INSERT
CREATE POLICY "contacts_insert_authenticated"
  ON public.contacts
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 3) Allow any authenticated user to UPDATE
CREATE POLICY "contacts_update_authenticated"
  ON public.contacts
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 4) Allow any authenticated user to DELETE
CREATE POLICY "contacts_delete_authenticated"
  ON public.contacts
  FOR DELETE
  USING (auth.role() = 'authenticated');

COMMENT ON POLICY contacts_select_all ON public.contacts IS 'All users can view contacts (public visibility)';
COMMENT ON POLICY contacts_insert_authenticated ON public.contacts IS 'Any authenticated user can create contacts';
COMMENT ON POLICY contacts_update_authenticated ON public.contacts IS 'Any authenticated user can update contacts';
COMMENT ON POLICY contacts_delete_authenticated ON public.contacts IS 'Any authenticated user can delete contacts';
