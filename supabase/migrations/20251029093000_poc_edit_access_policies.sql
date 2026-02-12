-- Allow authenticated POC users to view and edit events they are assigned to as POC
-- A POC is mapped via contacts.role = 'poc' and contacts.user_id = auth.uid()
-- POC assignment is stored on volunteer_roles.suggested_poc, which may be text or text[] across versions

ALTER TABLE IF EXISTS public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.volunteer_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.additional_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pre_event_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.itineraries ENABLE ROW LEVEL SECURITY;

-- Helper predicate used inline: does the current user appear as a POC for the given event?
-- Implemented by checking contacts (role='poc', user_id = auth.uid()) against volunteer_roles.suggested_poc
-- We support both legacy text and array-of-text formats using pg_typeof checks.

-- EVENTS: SELECT and UPDATE for POCs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='events' AND policyname='events_select_poc_access'
  ) THEN
    CREATE POLICY "events_select_poc_access" ON public.events
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.volunteer_roles vr
          JOIN public.contacts c ON c.role = 'poc' AND c.user_id = auth.uid()
          WHERE vr.event_id = events.id
            AND vr.suggested_poc @> ARRAY[c.id::text]
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='events' AND policyname='events_update_poc_access'
  ) THEN
    CREATE POLICY "events_update_poc_access" ON public.events
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.volunteer_roles vr
          JOIN public.contacts c ON c.role = 'poc' AND c.user_id = auth.uid()
          WHERE vr.event_id = events.id
            AND vr.suggested_poc @> ARRAY[c.id::text]
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.volunteer_roles vr
          JOIN public.contacts c ON c.role = 'poc' AND c.user_id = auth.uid()
          WHERE vr.event_id = events.id
            AND vr.suggested_poc @> ARRAY[c.id::text]
        )
      );
  END IF;
END$$;

-- VOLUNTEER_ROLES: POCs can fully manage roles for their events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='volunteer_roles' AND policyname='volunteer_roles_select_poc_access'
  ) THEN
    CREATE POLICY "volunteer_roles_select_poc_access" ON public.volunteer_roles
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.contacts c
          WHERE c.role = 'poc' AND c.user_id = auth.uid()
            AND (
              (pg_typeof(volunteer_roles.suggested_poc) = 'text[]'::regtype AND volunteer_roles.suggested_poc @> ARRAY[c.id::text])
              OR (pg_typeof(volunteer_roles.suggested_poc) = 'text'::regtype AND ARRAY[volunteer_roles.suggested_poc::text] @> ARRAY[c.id::text])
            )
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='volunteer_roles' AND policyname='volunteer_roles_write_poc_access'
  ) THEN
    CREATE POLICY "volunteer_roles_write_poc_access" ON public.volunteer_roles
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.contacts c
          WHERE c.role = 'poc' AND c.user_id = auth.uid()
            AND (
              (pg_typeof(volunteer_roles.suggested_poc) = 'text[]'::regtype AND volunteer_roles.suggested_poc @> ARRAY[c.id::text])
              OR (pg_typeof(volunteer_roles.suggested_poc) = 'text'::regtype AND ARRAY[volunteer_roles.suggested_poc::text] @> ARRAY[c.id::text])
            )
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.contacts c
          WHERE c.role = 'poc' AND c.user_id = auth.uid()
            AND (
              (pg_typeof(volunteer_roles.suggested_poc) = 'text[]'::regtype AND volunteer_roles.suggested_poc @> ARRAY[c.id::text])
              OR (pg_typeof(volunteer_roles.suggested_poc) = 'text'::regtype AND ARRAY[volunteer_roles.suggested_poc::text] @> ARRAY[c.id::text])
            )
        )
      );
  END IF;
END$$;

-- VOLUNTEERS: POCs can manage volunteers for their events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='volunteers' AND policyname='volunteers_poc_full_access'
  ) THEN
    CREATE POLICY "volunteers_poc_full_access" ON public.volunteers
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.events e
          JOIN public.contacts c ON c.role = 'poc' AND c.user_id = auth.uid()
          WHERE e.id = volunteers.event_id AND (
            EXISTS (
              SELECT 1 FROM public.volunteer_roles vr
              WHERE vr.event_id = e.id AND (
                (pg_typeof(vr.suggested_poc) = 'text[]'::regtype AND vr.suggested_poc @> ARRAY[c.id::text])
                OR (pg_typeof(vr.suggested_poc) = 'text'::regtype AND ARRAY[vr.suggested_poc::text] @> ARRAY[c.id::text])
              )
            )
          )
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.events e
          JOIN public.contacts c ON c.role = 'poc' AND c.user_id = auth.uid()
          WHERE e.id = volunteers.event_id AND (
            EXISTS (
              SELECT 1 FROM public.volunteer_roles vr
              WHERE vr.event_id = e.id AND (
                (pg_typeof(vr.suggested_poc) = 'text[]'::regtype AND vr.suggested_poc @> ARRAY[c.id::text])
                OR (pg_typeof(vr.suggested_poc) = 'text'::regtype AND ARRAY[vr.suggested_poc::text] @> ARRAY[c.id::text])
              )
            )
          )
        )
      );
  END IF;
END$$;

-- ADDITIONAL TABLES: additional_details, pre_event_tasks, itineraries (POC can manage for their events)
DO $$
BEGIN
  -- Helper template for each table
  PERFORM 1;
END$$;

-- additional_details
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='additional_details' AND policyname='additional_details_poc_full_access'
  ) THEN
    CREATE POLICY "additional_details_poc_full_access" ON public.additional_details
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.events e
          JOIN public.contacts c ON c.role = 'poc' AND c.user_id = auth.uid()
          WHERE e.id = additional_details.event_id AND (
            EXISTS (
              SELECT 1 FROM public.volunteer_roles vr
              WHERE vr.event_id = e.id AND (
                (pg_typeof(vr.suggested_poc) = 'text[]'::regtype AND vr.suggested_poc @> ARRAY[c.id::text])
                OR (pg_typeof(vr.suggested_poc) = 'text'::regtype AND ARRAY[vr.suggested_poc::text] @> ARRAY[c.id::text])
              )
            )
          )
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.events e
          JOIN public.contacts c ON c.role = 'poc' AND c.user_id = auth.uid()
          WHERE e.id = additional_details.event_id AND (
            EXISTS (
              SELECT 1 FROM public.volunteer_roles vr
              WHERE vr.event_id = e.id AND (
                (pg_typeof(vr.suggested_poc) = 'text[]'::regtype AND vr.suggested_poc @> ARRAY[c.id::text])
                OR (pg_typeof(vr.suggested_poc) = 'text'::regtype AND ARRAY[vr.suggested_poc::text] @> ARRAY[c.id::text])
              )
            )
          )
        )
      );
  END IF;
END$$;

-- pre_event_tasks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pre_event_tasks' AND policyname='pre_event_tasks_poc_full_access'
  ) THEN
    CREATE POLICY "pre_event_tasks_poc_full_access" ON public.pre_event_tasks
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.events e
          JOIN public.contacts c ON c.role = 'poc' AND c.user_id = auth.uid()
          WHERE e.id = pre_event_tasks.event_id AND (
            EXISTS (
              SELECT 1 FROM public.volunteer_roles vr
              WHERE vr.event_id = e.id AND vr.suggested_poc @> ARRAY[c.id::text]
            )
          )
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.events e
          JOIN public.contacts c ON c.role = 'poc' AND c.user_id = auth.uid()
          WHERE e.id = pre_event_tasks.event_id AND (
            EXISTS (
              SELECT 1 FROM public.volunteer_roles vr
              WHERE vr.event_id = e.id AND vr.suggested_poc @> ARRAY[c.id::text]
            )
          )
        )
      );
  END IF;
END$$;

-- itineraries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='itineraries' AND policyname='itineraries_poc_full_access'
  ) THEN
    CREATE POLICY "itineraries_poc_full_access" ON public.itineraries
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.events e
          JOIN public.contacts c ON c.role = 'poc' AND c.user_id = auth.uid()
          WHERE e.id = itineraries.event_id AND (
            EXISTS (
              SELECT 1 FROM public.volunteer_roles vr
              WHERE vr.event_id = e.id AND vr.suggested_poc @> ARRAY[c.id::text]
            )
          )
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.events e
          JOIN public.contacts c ON c.role = 'poc' AND c.user_id = auth.uid()
          WHERE e.id = itineraries.event_id AND (
            EXISTS (
              SELECT 1 FROM public.volunteer_roles vr
              WHERE vr.event_id = e.id AND vr.suggested_poc @> ARRAY[c.id::text]
            )
          )
        )
      );
  END IF;
END$$;

COMMENT ON POLICY "events_select_poc_access" ON public.events IS 'POC users can view events where they are assigned as POC via roles';
COMMENT ON POLICY "events_update_poc_access" ON public.events IS 'POC users can update events where they are assigned as POC';
COMMENT ON POLICY "volunteer_roles_write_poc_access" ON public.volunteer_roles IS 'POC users can manage roles for their events';
COMMENT ON POLICY "volunteers_poc_full_access" ON public.volunteers IS 'POC users can manage volunteers for their events';
COMMENT ON POLICY "additional_details_poc_full_access" ON public.additional_details IS 'POC users can manage additional details for their events';
COMMENT ON POLICY "pre_event_tasks_poc_full_access" ON public.pre_event_tasks IS 'POC users can manage pre-event tasks for their events';
COMMENT ON POLICY "itineraries_poc_full_access" ON public.itineraries IS 'POC users can manage itineraries for their events';


