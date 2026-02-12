-- Broadly open read access and volunteer update access to authenticated users (POCs)
-- This removes 406 Not Acceptable errors for event, profiles, and event_shares reads
-- and allows any logged-in user to update volunteer check-in status

-- Ensure RLS is enabled
ALTER TABLE IF EXISTS public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.event_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.volunteer_roles ENABLE ROW LEVEL SECURITY;

-- Grant basic privileges to authenticated (RLS still applies)
GRANT SELECT ON TABLE public.events TO authenticated;
GRANT SELECT ON TABLE public.event_shares TO authenticated;
GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT SELECT, UPDATE ON TABLE public.volunteers TO authenticated;
GRANT SELECT ON TABLE public.volunteer_roles TO authenticated;

-- Events: Authenticated can SELECT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='events' AND policyname='events_authenticated_select'
  ) THEN
    CREATE POLICY "events_authenticated_select" ON public.events
      FOR SELECT TO authenticated
      USING (true);
  END IF;
END$$;

-- Event shares: Authenticated can SELECT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='event_shares' AND policyname='event_shares_authenticated_select'
  ) THEN
    CREATE POLICY "event_shares_authenticated_select" ON public.event_shares
      FOR SELECT TO authenticated
      USING (true);
  END IF;
END$$;

-- Profiles: Authenticated can SELECT minimal fields (policy layer cannot restrict columns, do so at query level)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_authenticated_select'
  ) THEN
    CREATE POLICY "profiles_authenticated_select" ON public.profiles
      FOR SELECT TO authenticated
      USING (true);
  END IF;
END$$;

-- Volunteer roles: Authenticated can SELECT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='volunteer_roles' AND policyname='volunteer_roles_authenticated_select'
  ) THEN
    CREATE POLICY "volunteer_roles_authenticated_select" ON public.volunteer_roles
      FOR SELECT TO authenticated
      USING (true);
  END IF;
END$$;

-- Volunteers: Authenticated can SELECT and UPDATE (for check-in/out/notes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='volunteers' AND policyname='volunteers_authenticated_select'
  ) THEN
    CREATE POLICY "volunteers_authenticated_select" ON public.volunteers
      FOR SELECT TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='volunteers' AND policyname='volunteers_authenticated_update'
  ) THEN
    CREATE POLICY "volunteers_authenticated_update" ON public.volunteers
      FOR UPDATE TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END$$;

COMMENT ON POLICY "events_authenticated_select" ON public.events IS 'All authenticated users can view events.';
COMMENT ON POLICY "event_shares_authenticated_select" ON public.event_shares IS 'All authenticated users can view event shares.';
COMMENT ON POLICY "profiles_authenticated_select" ON public.profiles IS 'All authenticated users can view profiles.';
COMMENT ON POLICY "volunteer_roles_authenticated_select" ON public.volunteer_roles IS 'All authenticated users can view volunteer roles.';
COMMENT ON POLICY "volunteers_authenticated_select" ON public.volunteers IS 'All authenticated users can view volunteers.';
COMMENT ON POLICY "volunteers_authenticated_update" ON public.volunteers IS 'All authenticated users can update volunteers (check-in/out/notes).';


