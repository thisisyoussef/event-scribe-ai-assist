-- Corrected fix for 406 Not Acceptable errors
-- This migration cleans up all RLS policies and creates a clean, working configuration

-- First, let's completely reset the RLS policies for events table
ALTER TABLE events DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on events table
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'events'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.events', rec.policyname);
  END LOOP;
END$$;

-- Re-enable RLS on events
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Create clean, simple policies for events
-- 1. Allow all authenticated users to view all non-deleted events
CREATE POLICY "events_select_all_authenticated" ON events
  FOR SELECT USING (
    auth.role() = 'authenticated' 
    AND deleted_at IS NULL
  );

-- 2. Allow users to insert events
CREATE POLICY "events_insert_authenticated" ON events
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 3. Allow users to update events they created
CREATE POLICY "events_update_own" ON events
  FOR UPDATE USING (
    auth.role() = 'authenticated' 
    AND created_by = auth.uid()
  );

-- 4. Allow users to delete events they created (soft delete)
CREATE POLICY "events_delete_own" ON events
  FOR DELETE USING (
    auth.role() = 'authenticated' 
    AND created_by = auth.uid()
  );

-- Now fix the contacts table policies
ALTER TABLE contacts DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on contacts table
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

-- Re-enable RLS on contacts
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Create clean policies for contacts
-- 1. Allow all authenticated users to view all contacts
CREATE POLICY "contacts_select_all_authenticated" ON contacts
  FOR SELECT USING (auth.role() = 'authenticated');

-- 2. Allow authenticated users to insert contacts
CREATE POLICY "contacts_insert_authenticated" ON contacts
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 3. Allow authenticated users to update contacts
CREATE POLICY "contacts_update_authenticated" ON contacts
  FOR UPDATE USING (auth.role() = 'authenticated');

-- 4. Allow authenticated users to delete contacts
CREATE POLICY "contacts_delete_authenticated" ON contacts
  FOR DELETE USING (auth.role() = 'authenticated');

-- Fix volunteer_roles table policies
ALTER TABLE volunteer_roles DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on volunteer_roles table
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'volunteer_roles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.volunteer_roles', rec.policyname);
  END LOOP;
END$$;

-- Re-enable RLS on volunteer_roles
ALTER TABLE volunteer_roles ENABLE ROW LEVEL SECURITY;

-- Create clean policies for volunteer_roles
-- 1. Allow all authenticated users to view volunteer roles
CREATE POLICY "volunteer_roles_select_all_authenticated" ON volunteer_roles
  FOR SELECT USING (auth.role() = 'authenticated');

-- 2. Allow authenticated users to insert volunteer roles
CREATE POLICY "volunteer_roles_insert_authenticated" ON volunteer_roles
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 3. Allow authenticated users to update volunteer roles
CREATE POLICY "volunteer_roles_update_authenticated" ON volunteer_roles
  FOR UPDATE USING (auth.role() = 'authenticated');

-- 4. Allow authenticated users to delete volunteer roles
CREATE POLICY "volunteer_roles_delete_authenticated" ON volunteer_roles
  FOR DELETE USING (auth.role() = 'authenticated');

-- Fix volunteers table policies
ALTER TABLE volunteers DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on volunteers table
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'volunteers'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.volunteers', rec.policyname);
  END LOOP;
END$$;

-- Re-enable RLS on volunteers
ALTER TABLE volunteers ENABLE ROW LEVEL SECURITY;

-- Create clean policies for volunteers
-- 1. Allow all authenticated users to view volunteers
CREATE POLICY "volunteers_select_all_authenticated" ON volunteers
  FOR SELECT USING (auth.role() = 'authenticated');

-- 2. Allow authenticated users to insert volunteers
CREATE POLICY "volunteers_insert_authenticated" ON volunteers
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 3. Allow authenticated users to update volunteers
CREATE POLICY "volunteers_update_authenticated" ON volunteers
  FOR UPDATE USING (auth.role() = 'authenticated');

-- 4. Allow authenticated users to delete volunteers
CREATE POLICY "volunteers_delete_authenticated" ON volunteers
  FOR DELETE USING (auth.role() = 'authenticated');

-- Add comments explaining the policy structure
COMMENT ON POLICY events_select_all_authenticated ON events IS 'All authenticated users can view non-deleted events';
COMMENT ON POLICY events_insert_authenticated ON events IS 'All authenticated users can create events';
COMMENT ON POLICY events_update_own ON events IS 'Users can update events they created';
COMMENT ON POLICY events_delete_own ON events IS 'Users can delete events they created';

COMMENT ON POLICY contacts_select_all_authenticated ON contacts IS 'All authenticated users can view all contacts';
COMMENT ON POLICY contacts_insert_authenticated ON contacts IS 'All authenticated users can create contacts';
COMMENT ON POLICY contacts_update_authenticated ON contacts IS 'All authenticated users can update contacts';
COMMENT ON POLICY contacts_delete_authenticated ON contacts IS 'All authenticated users can delete contacts';

COMMENT ON POLICY volunteer_roles_select_all_authenticated ON volunteer_roles IS 'All authenticated users can view volunteer roles';
COMMENT ON POLICY volunteer_roles_insert_authenticated ON volunteer_roles IS 'All authenticated users can create volunteer roles';
COMMENT ON POLICY volunteer_roles_update_authenticated ON volunteer_roles IS 'All authenticated users can update volunteer roles';
COMMENT ON POLICY volunteer_roles_delete_authenticated ON volunteer_roles IS 'All authenticated users can delete volunteer roles';

COMMENT ON POLICY volunteers_select_all_authenticated ON volunteers IS 'All authenticated users can view volunteers';
COMMENT ON POLICY volunteers_insert_authenticated ON volunteers IS 'All authenticated users can create volunteers';
COMMENT ON POLICY volunteers_update_authenticated ON volunteers IS 'All authenticated users can update volunteers';
COMMENT ON POLICY volunteers_delete_authenticated ON volunteers IS 'All authenticated users can delete volunteers';

-- Ensure all tables have proper indexes for performance (only create if they don't exist)
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);
CREATE INDEX IF NOT EXISTS idx_events_deleted_at ON events(deleted_at);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_volunteer_roles_event_id ON volunteer_roles(event_id);
CREATE INDEX IF NOT EXISTS idx_volunteers_event_id ON volunteers(event_id);
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);

-- Add a comment explaining the comprehensive fix
COMMENT ON TABLE events IS 'Events table with clean RLS policies - all authenticated users have full access';
COMMENT ON TABLE contacts IS 'Contacts table with clean RLS policies - all authenticated users have full access';
COMMENT ON TABLE volunteer_roles IS 'Volunteer roles table with clean RLS policies - all authenticated users have full access';
COMMENT ON TABLE volunteers IS 'Volunteers table with clean RLS policies - all authenticated users have full access';
