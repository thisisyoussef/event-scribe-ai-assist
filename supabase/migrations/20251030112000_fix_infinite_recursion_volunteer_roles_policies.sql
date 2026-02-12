-- Fix RLS infinite recursion involving events <-> volunteer_roles by introducing
-- a SECURITY DEFINER helper and refactoring policies to call it instead of
-- cross-table subqueries.

-- 1) Create helper function that determines if the current user is a POC for a given event
--    The function runs as owner (postgres) and bypasses RLS; it reads request.jwt.claims
--    for auth.uid() and safely restricts search_path.
CREATE OR REPLACE FUNCTION public.is_user_poc_for_event(p_event_id uuid)
RETURNS boolean
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE sql
AS $fn$
  SELECT EXISTS (
    SELECT 1
    FROM public.contacts c
    WHERE c.role = 'poc'
      AND c.user_id = auth.uid()
      AND EXISTS (
        SELECT 1
        FROM public.volunteer_roles vr
        WHERE vr.event_id = p_event_id
          AND (
            (pg_typeof(vr.suggested_poc) = 'text[]'::regtype AND vr.suggested_poc @> ARRAY[c.id::text])
            OR (pg_typeof(vr.suggested_poc) = 'text'::regtype AND ARRAY[vr.suggested_poc::text] @> ARRAY[c.id::text])
          )
      )
  );
$fn$;

-- Lock down execute privileges to authenticated only (adjust if anon needs it later)
REVOKE ALL ON FUNCTION public.is_user_poc_for_event(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_user_poc_for_event(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_poc_for_event(uuid) TO service_role;

-- 2) Refactor policies to use the helper (removes cross-table policy dependencies)

-- events: POC access policies
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='events' AND policyname='events_select_poc_access'
  ) THEN
    ALTER POLICY "events_select_poc_access" ON public.events
      USING (public.is_user_poc_for_event(events.id));
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='events' AND policyname='events_update_poc_access'
  ) THEN
    ALTER POLICY "events_update_poc_access" ON public.events
      USING (public.is_user_poc_for_event(events.id))
      WITH CHECK (public.is_user_poc_for_event(events.id));
  END IF;
END$$;

-- volunteers: POC full access based on event_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='volunteers' AND policyname='volunteers_poc_full_access'
  ) THEN
    ALTER POLICY "volunteers_poc_full_access" ON public.volunteers
      USING (public.is_user_poc_for_event(volunteers.event_id))
      WITH CHECK (public.is_user_poc_for_event(volunteers.event_id));
  END IF;
END$$;

-- additional_details: POC full access based on event_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='additional_details' AND policyname='additional_details_poc_full_access'
  ) THEN
    ALTER POLICY "additional_details_poc_full_access" ON public.additional_details
      USING (public.is_user_poc_for_event(additional_details.event_id))
      WITH CHECK (public.is_user_poc_for_event(additional_details.event_id));
  END IF;
END$$;

-- pre_event_tasks: POC full access based on event_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pre_event_tasks' AND policyname='pre_event_tasks_poc_full_access'
  ) THEN
    ALTER POLICY "pre_event_tasks_poc_full_access" ON public.pre_event_tasks
      USING (public.is_user_poc_for_event(pre_event_tasks.event_id))
      WITH CHECK (public.is_user_poc_for_event(pre_event_tasks.event_id));
  END IF;
END$$;

-- itineraries: POC full access based on event_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='itineraries' AND policyname='itineraries_poc_full_access'
  ) THEN
    ALTER POLICY "itineraries_poc_full_access" ON public.itineraries
      USING (public.is_user_poc_for_event(itineraries.event_id))
      WITH CHECK (public.is_user_poc_for_event(itineraries.event_id));
  END IF;
END$$;

-- Note: We intentionally do not change volunteer_roles policies here; the cycle was
-- from events->volunteer_roles and volunteer_roles->events. By removing the direct
-- reference in events policies, recursion is resolved while preserving existing
-- ownership/shared-access rules on volunteer_roles.

COMMENT ON FUNCTION public.is_user_poc_for_event(uuid) IS 'Returns true if the current user (auth.uid) is a POC for the given event, using suggested_poc matching. SECURITY DEFINER to avoid RLS recursion in policies.';


