-- Allow authenticated public signups to create a contact for the event owner
-- Context: Frontend inserts into contacts with user_id = event.created_by during public signup
-- Error fixed: permission denied for table contacts (code 42501) when session is authenticated

-- Ensure RLS is enabled (defensive)
ALTER TABLE IF EXISTS public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.volunteer_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.volunteers ENABLE ROW LEVEL SECURITY;

-- Ensure the anon and authenticated roles have the necessary table privileges (RLS still governs rows)
GRANT INSERT ON TABLE public.contacts TO anon;
GRANT SELECT ON TABLE public.contacts TO anon;
GRANT INSERT ON TABLE public.contacts TO authenticated;
GRANT SELECT ON TABLE public.conta  cts TO authenticated;
GRANT SELECT ON TABLE public.events TO authenticated;
GRANT SELECT ON TABLE public.volunteer_roles TO authenticated;
GRANT SELECT ON TABLE public.volunteers TO authenticated;

-- Policy: authenticated users can INSERT a contact only if that contact belongs to a user
-- who owns at least one published & public, non-deleted event (i.e., an event owners list).
-- This mirrors the public-signup flow where contacts are created under the event owner's account.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'contacts' AND policyname = 'contacts_insert_for_public_published_event_owners_authenticated'
  ) THEN
    CREATE POLICY "contacts_insert_for_public_published_event_owners_authenticated" ON public.contacts
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.events e
          WHERE e.created_by = contacts.user_id
            AND e.status = 'published'
            AND COALESCE(e.is_public, false) = true
            AND e.deleted_at IS NULL
        )
      );
  END IF;
END$$;

COMMENT ON POLICY "contacts_insert_for_public_published_event_owners_authenticated" ON public.contacts
  IS 'Authenticated users can insert contacts under an event owner who has at least one published & public event.';

-- Policy: authenticated users can SELECT contacts that were created via volunteer signup.
-- This allows the frontend to .insert(...).select('id') in one call.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'contacts' AND policyname = 'contacts_select_volunteer_signup_authenticated'
  ) THEN
    CREATE POLICY "contacts_select_volunteer_signup_authenticated" ON public.contacts
      FOR SELECT
      TO authenticated
      USING (source = 'volunteer_signup');
  END IF;
END$$;

COMMENT ON POLICY "contacts_select_volunteer_signup_authenticated" ON public.contacts
  IS 'Authenticated users can read contacts created through volunteer signup (needed for returning id after insert).';

-- Policy: anonymous users can INSERT a contact only if that contact belongs to a user
-- who owns at least one published & public, non-deleted event (public signup flow).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'contacts' AND policyname = 'contacts_insert_for_public_published_event_owners_anon'
  ) THEN
    CREATE POLICY "contacts_insert_for_public_published_event_owners_anon" ON public.contacts
      FOR INSERT
      TO anon
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.events e
          WHERE e.created_by = contacts.user_id
            AND e.status = 'published'
            AND COALESCE(e.is_public, false) = true
            AND e.deleted_at IS NULL
        )
      );
  END IF;
END$$;

-- Allow anon to SELECT contacts created via volunteer signup (for returning id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'contacts' AND policyname = 'contacts_select_volunteer_signup_anon'
  ) THEN
    CREATE POLICY "contacts_select_volunteer_signup_anon" ON public.contacts
      FOR SELECT
      TO anon
      USING (source = 'volunteer_signup');
  END IF;
END$$;

-- Allow anon to SELECT contacts for owners of published & public events (needed to check existing by phone)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'contacts' AND policyname = 'contacts_select_for_public_published_event_owners_anon'
  ) THEN
    CREATE POLICY "contacts_select_for_public_published_event_owners_anon" ON public.contacts
      FOR SELECT
      TO anon
      USING (
        EXISTS (
          SELECT 1 FROM public.events e
          WHERE e.created_by = contacts.user_id
            AND e.status = 'published'
            AND COALESCE(e.is_public, false) = true
            AND e.deleted_at IS NULL
        )
      );
  END IF;
END$$;

-- Allow authenticated to SELECT contacts for owners of published & public events (same need as anon)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'contacts' AND policyname = 'contacts_select_for_public_published_event_owners_authenticated'
  ) THEN
    CREATE POLICY "contacts_select_for_public_published_event_owners_authenticated" ON public.contacts
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.events e
          WHERE e.created_by = contacts.user_id
            AND e.status = 'published'
            AND COALESCE(e.is_public, false) = true
            AND e.deleted_at IS NULL
        )
      );
  END IF;
END$$;

-- =============================================================
-- Authenticated visibility: allow reading public signup data like anon
-- =============================================================

-- Events: authenticated can read published & public events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'events_public_select_published_public_authenticated'
  ) THEN
    CREATE POLICY "events_public_select_published_public_authenticated" ON public.events
      FOR SELECT
      TO authenticated
      USING (
        status = 'published' AND COALESCE(is_public, false) = true AND deleted_at IS NULL
      );
  END IF;
END$$;

-- volunteer_roles: authenticated can read roles for published & public events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'volunteer_roles' AND policyname = 'volunteer_roles_public_select_for_published_public_events_authenticated'
  ) THEN
    CREATE POLICY "volunteer_roles_public_select_for_published_public_events_authenticated" ON public.volunteer_roles
      FOR SELECT
      TO authenticated
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

-- volunteers: authenticated can read volunteers for published & public events (for local counts)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'volunteers' AND policyname = 'volunteers_public_select_for_published_public_events_authenticated'
  ) THEN
    CREATE POLICY "volunteers_public_select_for_published_public_events_authenticated" ON public.volunteers
      FOR SELECT
      TO authenticated
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

-- =============================================================
-- volunteer_signups policies to support public/authenticated signup flow
-- =============================================================

-- Ensure RLS is enabled (defensive)
ALTER TABLE IF EXISTS public.volunteer_signups ENABLE ROW LEVEL SECURITY;

-- Grants required for anon/authenticated to insert/select where policies allow
GRANT INSERT ON TABLE public.volunteer_signups TO anon;
GRANT SELECT ON TABLE public.volunteer_signups TO anon;
GRANT INSERT ON TABLE public.volunteer_signups TO authenticated;
GRANT SELECT ON TABLE public.volunteer_signups TO authenticated;

-- Allow anon to INSERT volunteer_signups for published & public events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'volunteer_signups' AND policyname = 'volunteer_signups_public_insert_for_published_public_events_anon'
  ) THEN
    CREATE POLICY "volunteer_signups_public_insert_for_published_public_events_anon" ON public.volunteer_signups
      FOR INSERT
      TO anon
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.events e
          WHERE e.id = volunteer_signups.event_id
            AND e.status = 'published'
            AND COALESCE(e.is_public, false) = true
            AND e.deleted_at IS NULL
        )
      );
  END IF;
END$$;

-- Allow authenticated to INSERT volunteer_signups for published & public events (same as anon)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'volunteer_signups' AND policyname = 'volunteer_signups_public_insert_for_published_public_events_authenticated'
  ) THEN
    CREATE POLICY "volunteer_signups_public_insert_for_published_public_events_authenticated" ON public.volunteer_signups
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.events e
          WHERE e.id = volunteer_signups.event_id
            AND e.status = 'published'
            AND COALESCE(e.is_public, false) = true
            AND e.deleted_at IS NULL
        )
      );
  END IF;
END$$;

-- Allow anon and authenticated to SELECT volunteer_signups for published & public events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'volunteer_signups' AND policyname = 'volunteer_signups_public_select_for_published_public_events'
  ) THEN
    CREATE POLICY "volunteer_signups_public_select_for_published_public_events" ON public.volunteer_signups
      FOR SELECT
      TO anon, authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.events e
          WHERE e.id = volunteer_signups.event_id
            AND e.status = 'published'
            AND COALESCE(e.is_public, false) = true
            AND e.deleted_at IS NULL
        )
      );
  END IF;
END$$;

COMMENT ON POLICY "volunteer_signups_public_insert_for_published_public_events_anon" ON public.volunteer_signups IS 'Anon can insert signup history for published & public events.';
COMMENT ON POLICY "volunteer_signups_public_insert_for_published_public_events_authenticated" ON public.volunteer_signups IS 'Authenticated can insert signup history for published & public events.';
COMMENT ON POLICY "volunteer_signups_public_select_for_published_public_events" ON public.volunteer_signups IS 'Anon/authenticated can read signup history for published & public events (limited).';


