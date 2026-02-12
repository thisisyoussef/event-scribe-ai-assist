-- Break recursion in volunteer_roles policies by removing direct references to events
-- and event_shares inside policy USING/WITH CHECK expressions. Replace with
-- SECURITY DEFINER helper functions.

-- Helper: can current user view an event (owner or any share)
CREATE OR REPLACE FUNCTION public.user_can_view_event(p_event_id uuid)
RETURNS boolean
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE sql
AS $fn$
  SELECT (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = p_event_id AND e.created_by = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.event_shares es
      WHERE es.event_id = p_event_id AND es.shared_with = auth.uid()
    )
  );
$fn$;

REVOKE ALL ON FUNCTION public.user_can_view_event(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_can_view_event(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_view_event(uuid) TO service_role;

-- Helper: can current user edit an event (owner or shared with edit permission)
CREATE OR REPLACE FUNCTION public.user_can_edit_event(p_event_id uuid)
RETURNS boolean
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE sql
AS $fn$
  SELECT (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = p_event_id AND e.created_by = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.event_shares es
      WHERE es.event_id = p_event_id AND es.shared_with = auth.uid() AND es.permission_level = 'edit'
    )
  );
$fn$;

REVOKE ALL ON FUNCTION public.user_can_edit_event(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_can_edit_event(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_edit_event(uuid) TO service_role;

-- Helper: is an event published and public (for anon signup flows)
CREATE OR REPLACE FUNCTION public.event_is_published_public(p_event_id uuid)
RETURNS boolean
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE sql
AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = p_event_id
      AND e.status = 'published'
      AND COALESCE(e.is_public, false) = true
      AND e.deleted_at IS NULL
  );
$fn$;

REVOKE ALL ON FUNCTION public.event_is_published_public(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.event_is_published_public(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.event_is_published_public(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.event_is_published_public(uuid) TO service_role;

-- Alter volunteer_roles policies to use helpers instead of joining to events/event_shares
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='volunteer_roles' AND policyname='volunteer_roles_select_owned_or_shared'
  ) THEN
    ALTER POLICY "volunteer_roles_select_owned_or_shared" ON public.volunteer_roles
      USING (public.user_can_view_event(public.volunteer_roles.event_id));
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='volunteer_roles' AND policyname='volunteer_roles_insert_owned_or_edit_shared'
  ) THEN
    ALTER POLICY "volunteer_roles_insert_owned_or_edit_shared" ON public.volunteer_roles
      WITH CHECK (public.user_can_edit_event(public.volunteer_roles.event_id));
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='volunteer_roles' AND policyname='volunteer_roles_update_owned_or_edit_shared'
  ) THEN
    ALTER POLICY "volunteer_roles_update_owned_or_edit_shared" ON public.volunteer_roles
      USING (public.user_can_edit_event(public.volunteer_roles.event_id))
      WITH CHECK (public.user_can_edit_event(public.volunteer_roles.event_id));
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='volunteer_roles' AND policyname='volunteer_roles_delete_owned_or_edit_shared'
  ) THEN
    ALTER POLICY "volunteer_roles_delete_owned_or_edit_shared" ON public.volunteer_roles
      USING (public.user_can_edit_event(public.volunteer_roles.event_id));
  END IF;
END$$;

-- Also alter volunteers policies (same ownership/share rules) to avoid future recursion via events
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='volunteers' AND policyname='volunteers_select_owned_or_shared'
  ) THEN
    ALTER POLICY "volunteers_select_owned_or_shared" ON public.volunteers
      USING (public.user_can_view_event(public.volunteers.event_id));
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='volunteers' AND policyname='volunteers_insert_owned_or_edit_shared'
  ) THEN
    ALTER POLICY "volunteers_insert_owned_or_edit_shared" ON public.volunteers
      WITH CHECK (public.user_can_edit_event(public.volunteers.event_id));
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='volunteers' AND policyname='volunteers_update_owned_or_edit_shared'
  ) THEN
    ALTER POLICY "volunteers_update_owned_or_edit_shared" ON public.volunteers
      USING (public.user_can_edit_event(public.volunteers.event_id))
      WITH CHECK (public.user_can_edit_event(public.volunteers.event_id));
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='volunteers' AND policyname='volunteers_delete_owned_or_edit_shared'
  ) THEN
    ALTER POLICY "volunteers_delete_owned_or_edit_shared" ON public.volunteers
      USING (public.user_can_edit_event(public.volunteers.event_id));
  END IF;
END$$;

-- Refactor public signup policies for volunteer_roles/volunteers to avoid joins to events
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='volunteer_roles' AND policyname='volunteer_roles_public_select_for_published_public_events'
  ) THEN
    ALTER POLICY "volunteer_roles_public_select_for_published_public_events" ON public.volunteer_roles
      USING (public.event_is_published_public(public.volunteer_roles.event_id));
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='volunteers' AND policyname='volunteers_public_select_for_published_public_events'
  ) THEN
    ALTER POLICY "volunteers_public_select_for_published_public_events" ON public.volunteers
      USING (public.event_is_published_public(public.volunteers.event_id));
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='volunteers' AND policyname='volunteers_public_insert_for_published_public_events'
  ) THEN
    ALTER POLICY "volunteers_public_insert_for_published_public_events" ON public.volunteers
      WITH CHECK (public.event_is_published_public(public.volunteers.event_id));
  END IF;
END$$;

COMMENT ON FUNCTION public.user_can_view_event(uuid) IS 'Owner or shared user can view event; SECURITY DEFINER to avoid recursion.';
COMMENT ON FUNCTION public.user_can_edit_event(uuid) IS 'Owner or edit-shared user can edit event; SECURITY DEFINER to avoid recursion.';
COMMENT ON FUNCTION public.event_is_published_public(uuid) IS 'Returns true if event is published, public, not deleted; SECURITY DEFINER for anon-safe use.';


