-- Secure RLS for all public tables
-- Enables and forces RLS on volunteers and volunteer_roles tables

-- ===========================================
-- SECURE VOLUNTEERS TABLE
-- ===========================================

-- Enable and force RLS on volunteers
ALTER TABLE public.volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteers FORCE ROW LEVEL SECURITY;

-- Drop ALL existing policies on volunteers table to avoid conflicts
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

-- Strict policies for volunteers based on event ownership or shares
CREATE POLICY "volunteers_select_owned_or_shared" ON public.volunteers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = public.volunteers.event_id AND e.created_by = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.event_shares es
      WHERE es.event_id = public.volunteers.event_id AND es.shared_with = auth.uid()
    )
  );

CREATE POLICY "volunteers_insert_owned_or_edit_shared" ON public.volunteers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = public.volunteers.event_id AND e.created_by = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.event_shares es
      WHERE es.event_id = public.volunteers.event_id AND es.shared_with = auth.uid() AND es.permission_level = 'edit'
    )
  );

CREATE POLICY "volunteers_update_owned_or_edit_shared" ON public.volunteers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = public.volunteers.event_id AND e.created_by = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.event_shares es
      WHERE es.event_id = public.volunteers.event_id AND es.shared_with = auth.uid() AND es.permission_level = 'edit'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = public.volunteers.event_id AND e.created_by = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.event_shares es
      WHERE es.event_id = public.volunteers.event_id AND es.shared_with = auth.uid() AND es.permission_level = 'edit'
    )
  );

CREATE POLICY "volunteers_delete_owned_or_edit_shared" ON public.volunteers
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = public.volunteers.event_id AND e.created_by = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.event_shares es
      WHERE es.event_id = public.volunteers.event_id AND es.shared_with = auth.uid() AND es.permission_level = 'edit'
    )
  );

-- Service role full access for volunteers
CREATE POLICY "volunteers_service_full_access" ON public.volunteers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ===========================================
-- SECURE VOLUNTEER_ROLES TABLE
-- ===========================================

-- Enable and force RLS on volunteer_roles
ALTER TABLE public.volunteer_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_roles FORCE ROW LEVEL SECURITY;

-- Drop ALL existing policies on volunteer_roles table to avoid conflicts
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

-- Strict policies for volunteer_roles based on event ownership or shares
CREATE POLICY "volunteer_roles_select_owned_or_shared" ON public.volunteer_roles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = public.volunteer_roles.event_id AND e.created_by = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.event_shares es
      WHERE es.event_id = public.volunteer_roles.event_id AND es.shared_with = auth.uid()
    )
  );

CREATE POLICY "volunteer_roles_insert_owned_or_edit_shared" ON public.volunteer_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = public.volunteer_roles.event_id AND e.created_by = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.event_shares es
      WHERE es.event_id = public.volunteer_roles.event_id AND es.shared_with = auth.uid() AND es.permission_level = 'edit'
    )
  );

CREATE POLICY "volunteer_roles_update_owned_or_edit_shared" ON public.volunteer_roles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = public.volunteer_roles.event_id AND e.created_by = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.event_shares es
      WHERE es.event_id = public.volunteer_roles.event_id AND es.shared_with = auth.uid() AND es.permission_level = 'edit'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = public.volunteer_roles.event_id AND e.created_by = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.event_shares es
      WHERE es.event_id = public.volunteer_roles.event_id AND es.shared_with = auth.uid() AND es.permission_level = 'edit'
    )
  );

CREATE POLICY "volunteer_roles_delete_owned_or_edit_shared" ON public.volunteer_roles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = public.volunteer_roles.event_id AND e.created_by = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.event_shares es
      WHERE es.event_id = public.volunteer_roles.event_id AND es.shared_with = auth.uid() AND es.permission_level = 'edit'
    )
  );

-- Service role full access for volunteer_roles
CREATE POLICY "volunteer_roles_service_full_access" ON public.volunteer_roles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ===========================================
-- SECURE GRANTS
-- ===========================================

-- Tighten grants: revoke anon access, grant authenticated
REVOKE ALL ON TABLE public.volunteers FROM anon;
REVOKE ALL ON TABLE public.volunteer_roles FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.volunteers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.volunteer_roles TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE public.volunteers IS 'Volunteers table with strict RLS policies - only event owners and shared editors can access';
COMMENT ON TABLE public.volunteer_roles IS 'Volunteer roles table with strict RLS policies - only event owners and shared editors can access';






















