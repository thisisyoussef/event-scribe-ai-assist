-- Secure RLS for public.volunteers
-- Enables and forces RLS, removes permissive policies, and adds strict policies

-- Enable and force RLS on volunteers
ALTER TABLE public.volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteers FORCE ROW LEVEL SECURITY;

-- Drop ALL existing policies on volunteers table to avoid conflicts
DO $$
DECLARE
  rec RECORD;
BEGIN
  -- Drop all existing policies on volunteers table
  FOR rec IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'volunteers'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.volunteers', rec.policyname);
  END LOOP;
END$$;

-- Strict policies for authenticated users based on event ownership or shares
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

-- Service role full access (bypasses auth.uid requirements using role)
CREATE POLICY "volunteers_service_full_access" ON public.volunteers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Tighten grants: revoke anon; grant authenticated. RLS still applies
REVOKE ALL ON TABLE public.volunteers FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.volunteers TO authenticated;


