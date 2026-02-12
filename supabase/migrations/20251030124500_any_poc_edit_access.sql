-- Any authenticated POC can edit events and volunteer roles
-- Restores a simple helper and adds permissive policies for POCs

ALTER TABLE IF EXISTS public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.volunteer_roles ENABLE ROW LEVEL SECURITY;

-- Helper: is current user a POC?
CREATE OR REPLACE FUNCTION public.user_is_poc()
RETURNS boolean
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE sql
AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.contacts c
    WHERE c.user_id = auth.uid() AND c.role = 'poc'
  );
$fn$;

REVOKE ALL ON FUNCTION public.user_is_poc() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_is_poc() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_poc() TO service_role;

-- Policy: any authenticated POC can UPDATE any non-deleted event
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'events_update_any_poc'
  ) THEN
    CREATE POLICY "events_update_any_poc" ON public.events
      FOR UPDATE TO authenticated
      USING (public.user_is_poc() AND deleted_at IS NULL)
      WITH CHECK (public.user_is_poc() AND deleted_at IS NULL);
  END IF;
END$$;

COMMENT ON POLICY "events_update_any_poc" ON public.events IS 'Any authenticated POC can update any non-deleted event.';

-- Policies: any authenticated POC can manage volunteer_roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'volunteer_roles' AND policyname = 'volunteer_roles_poc_select'
  ) THEN
    CREATE POLICY "volunteer_roles_poc_select" ON public.volunteer_roles
      FOR SELECT TO authenticated
      USING (public.user_is_poc());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'volunteer_roles' AND policyname = 'volunteer_roles_poc_insert'
  ) THEN
    CREATE POLICY "volunteer_roles_poc_insert" ON public.volunteer_roles
      FOR INSERT TO authenticated
      WITH CHECK (public.user_is_poc());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'volunteer_roles' AND policyname = 'volunteer_roles_poc_update'
  ) THEN
    CREATE POLICY "volunteer_roles_poc_update" ON public.volunteer_roles
      FOR UPDATE TO authenticated
      USING (public.user_is_poc())
      WITH CHECK (public.user_is_poc());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'volunteer_roles' AND policyname = 'volunteer_roles_poc_delete'
  ) THEN
    CREATE POLICY "volunteer_roles_poc_delete" ON public.volunteer_roles
      FOR DELETE TO authenticated
      USING (public.user_is_poc());
  END IF;
END$$;

COMMENT ON POLICY "volunteer_roles_poc_select" ON public.volunteer_roles IS 'Any authenticated POC can view roles.';
COMMENT ON POLICY "volunteer_roles_poc_insert" ON public.volunteer_roles IS 'Any authenticated POC can insert roles.';
COMMENT ON POLICY "volunteer_roles_poc_update" ON public.volunteer_roles IS 'Any authenticated POC can update roles.';
COMMENT ON POLICY "volunteer_roles_poc_delete" ON public.volunteer_roles IS 'Any authenticated POC can delete roles.';


