-- Restore public access required for volunteer signup pages
-- Allows anonymous users to view published, public events and related data
-- Also allows anonymous users to submit volunteer signups for those events

-- Ensure RLS is enabled (some tables may already have it forced/enabled by prior migrations)
ALTER TABLE IF EXISTS public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.volunteer_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.contacts ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- Grants needed for anon to read/insert where RLS policies permit
-- =============================================================
GRANT SELECT ON TABLE public.events TO anon;
GRANT SELECT ON TABLE public.volunteer_roles TO anon;
GRANT SELECT ON TABLE public.volunteers TO anon;
GRANT INSERT ON TABLE public.volunteers TO anon;
GRANT SELECT ON TABLE public.contacts TO anon;

-- =============================================================
-- Public (anon) SELECT policies for published, public events
-- =============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'events_public_select_published_public'
  ) THEN
    CREATE POLICY "events_public_select_published_public" ON public.events
      FOR SELECT
      TO anon
      USING (
        status = 'published' AND COALESCE(is_public, false) = true AND deleted_at IS NULL
      );
  END IF;
END$$;

-- volunteer_roles visible when their event is published and public
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'volunteer_roles' AND policyname = 'volunteer_roles_public_select_for_published_public_events'
  ) THEN
    CREATE POLICY "volunteer_roles_public_select_for_published_public_events" ON public.volunteer_roles
      FOR SELECT
      TO anon
      USING (
        EXISTS (
          SELECT 1 FROM public.events e
          WHERE e.id = public.volunteer_roles.event_id
            AND e.status = 'published'
            AND COALESCE(e.is_public, false) = true
            AND e.deleted_at IS NULL
        )
      );
  END IF;
END$$;

-- volunteers visible when their event is published and public (needed for counts/rosters on signup page)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'volunteers' AND policyname = 'volunteers_public_select_for_published_public_events'
  ) THEN
    CREATE POLICY "volunteers_public_select_for_published_public_events" ON public.volunteers
      FOR SELECT
      TO anon
      USING (
        EXISTS (
          SELECT 1 FROM public.events e
          WHERE e.id = public.volunteers.event_id
            AND e.status = 'published'
            AND COALESCE(e.is_public, false) = true
            AND e.deleted_at IS NULL
        )
      );
  END IF;
END$$;

-- Allow anonymous INSERTs into volunteers for published, public events (the core of the public signup form)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'volunteers' AND policyname = 'volunteers_public_insert_for_published_public_events'
  ) THEN
    CREATE POLICY "volunteers_public_insert_for_published_public_events" ON public.volunteers
      FOR INSERT
      TO anon
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.events e
          WHERE e.id = public.volunteers.event_id
            AND e.status = 'published'
            AND COALESCE(e.is_public, false) = true
            AND e.deleted_at IS NULL
        )
      );
  END IF;
END$$;

-- contacts visible when referenced by roles for published, public events (POC display)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'contacts' AND policyname = 'contacts_public_select_for_published_public_events'
  ) THEN
    CREATE POLICY "contacts_public_select_for_published_public_events" ON public.contacts
      FOR SELECT
      TO anon
      USING (
        EXISTS (
          SELECT 1
          FROM public.volunteer_roles vr
          JOIN public.events e ON e.id = vr.event_id
          WHERE e.status = 'published'
            AND COALESCE(e.is_public, false) = true
            AND e.deleted_at IS NULL
            AND vr.suggested_poc IS NOT NULL
            AND vr.suggested_poc @> ARRAY[contacts.id::text]
        )
      );
  END IF;
END$$;

-- Documentation
COMMENT ON POLICY "events_public_select_published_public" ON public.events IS 'Anon can read published & public events (not deleted)';
COMMENT ON POLICY "volunteer_roles_public_select_for_published_public_events" ON public.volunteer_roles IS 'Anon can read roles for published & public events';
COMMENT ON POLICY "volunteers_public_select_for_published_public_events" ON public.volunteers IS 'Anon can read volunteers for published & public events';
COMMENT ON POLICY "volunteers_public_insert_for_published_public_events" ON public.volunteers IS 'Anon can insert signups for published & public events';
COMMENT ON POLICY "contacts_public_select_for_published_public_events" ON public.contacts IS 'Anon can read POC contacts referenced by roles of published & public events';


