-- Proper RLS configuration that should work without 406 errors
-- This creates minimal, working RLS policies

-- Re-enable RLS on all tables
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteers ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies first
DO $$
DECLARE
  rec RECORD;
BEGIN
  -- Drop events policies
  FOR rec IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'events'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.events', rec.policyname);
  END LOOP;
  
  -- Drop contacts policies
  FOR rec IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'contacts'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.contacts', rec.policyname);
  END LOOP;
  
  -- Drop volunteer_roles policies
  FOR rec IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'volunteer_roles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.volunteer_roles', rec.policyname);
  END LOOP;
  
  -- Drop volunteers policies
  FOR rec IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'volunteers'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.volunteers', rec.policyname);
  END LOOP;
END$$;

-- Create very simple, permissive policies for events
CREATE POLICY "events_allow_all" ON events
  FOR ALL USING (true) WITH CHECK (true);

-- Create very simple, permissive policies for contacts
CREATE POLICY "contacts_allow_all" ON contacts
  FOR ALL USING (true) WITH CHECK (true);

-- Create very simple, permissive policies for volunteer_roles
CREATE POLICY "volunteer_roles_allow_all" ON volunteer_roles
  FOR ALL USING (true) WITH CHECK (true);

-- Create very simple, permissive policies for volunteers
CREATE POLICY "volunteers_allow_all" ON volunteers
  FOR ALL USING (true) WITH CHECK (true);

-- Add comments
COMMENT ON POLICY events_allow_all ON events IS 'Permissive policy - allows all operations';
COMMENT ON POLICY contacts_allow_all ON contacts IS 'Permissive policy - allows all operations';
COMMENT ON POLICY volunteer_roles_allow_all ON volunteer_roles IS 'Permissive policy - allows all operations';
COMMENT ON POLICY volunteers_allow_all ON volunteers IS 'Permissive policy - allows all operations';

COMMENT ON TABLE events IS 'Events table with permissive RLS policies';
COMMENT ON TABLE contacts IS 'Contacts table with permissive RLS policies';
COMMENT ON TABLE volunteer_roles IS 'Volunteer roles table with permissive RLS policies';
COMMENT ON TABLE volunteers IS 'Volunteers table with permissive RLS policies';
