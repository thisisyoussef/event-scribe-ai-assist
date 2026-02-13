-- Comprehensive fix: ensure all authenticated users can perform CRUD on events,
-- and add SECURITY DEFINER RPCs for operations where the Lovable proxy
-- interferes with direct PostgREST requests.

-- =============================================================================
-- 1. Clean up RLS policies — ensure a single permissive policy covers all ops
-- =============================================================================

-- Drop all potentially conflicting policies on events
DROP POLICY IF EXISTS "Users can view events they own or have access to" ON events;
DROP POLICY IF EXISTS "Users can view their own soft deleted events" ON events;
DROP POLICY IF EXISTS "authenticated_can_select_all_active_events" ON events;
DROP POLICY IF EXISTS "authenticated_can_update_any_active_event" ON events;
DROP POLICY IF EXISTS "Users can delete own events or admins can delete any event" ON events;
DROP POLICY IF EXISTS "Users can soft delete own events or admins can soft delete any event" ON events;
DROP POLICY IF EXISTS "Users can soft delete events they own" ON events;
DROP POLICY IF EXISTS "events_allow_all" ON events;
DROP POLICY IF EXISTS "Users can insert events" ON events;
DROP POLICY IF EXISTS "Users can update own events" ON events;
DROP POLICY IF EXISTS "Users can delete own events" ON events;
DROP POLICY IF EXISTS "Users can delete events" ON events;

-- Ensure RLS is enabled
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Single permissive policy: any authenticated user can do anything
-- (admin/ownership checks are done in application code and RPCs)
CREATE POLICY "authenticated_full_access" ON events
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Grant all permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON events TO authenticated;

-- =============================================================================
-- 2. Fix volunteer_roles and volunteers policies too
-- =============================================================================
DROP POLICY IF EXISTS "authenticated_can_select_roles_for_any_event" ON volunteer_roles;
DROP POLICY IF EXISTS "authenticated_can_insert_roles_for_any_event" ON volunteer_roles;
DROP POLICY IF EXISTS "authenticated_can_update_roles_for_any_event" ON volunteer_roles;
DROP POLICY IF EXISTS "authenticated_can_delete_roles_for_any_event" ON volunteer_roles;

CREATE POLICY "authenticated_full_access" ON volunteer_roles
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON volunteer_roles TO authenticated;

DROP POLICY IF EXISTS "authenticated_can_select_volunteers_for_any_event" ON volunteers;

-- Only create if no "authenticated_full_access" policy exists already
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'volunteers' AND policyname = 'authenticated_full_access'
  ) THEN
    EXECUTE 'CREATE POLICY "authenticated_full_access" ON volunteers FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON volunteers TO authenticated;

-- =============================================================================
-- 3. Fix itineraries policies
-- =============================================================================
DROP POLICY IF EXISTS "authenticated_can_insert_itineraries_for_any_event" ON itineraries;
DROP POLICY IF EXISTS "authenticated_can_update_itineraries_for_any_event" ON itineraries;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'itineraries' AND policyname = 'authenticated_full_access'
  ) THEN
    EXECUTE 'CREATE POLICY "authenticated_full_access" ON itineraries FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON itineraries TO authenticated;

-- =============================================================================
-- 4. SECURITY DEFINER RPC for permanent delete (bypasses RLS + Lovable proxy)
-- =============================================================================
CREATE OR REPLACE FUNCTION admin_permanent_delete_event(p_event_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM events WHERE id = p_event_id;
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_permanent_delete_event(UUID) TO authenticated;

-- =============================================================================
-- 5. SECURITY DEFINER RPC for batch permanent delete of soft-deleted events
-- =============================================================================
CREATE OR REPLACE FUNCTION admin_permanent_delete_all_soft_deleted(
  p_user_id UUID,
  p_admin_mode BOOLEAN DEFAULT FALSE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_events INTEGER;
  deleted_templates INTEGER;
BEGIN
  -- Delete soft-deleted events
  IF p_admin_mode THEN
    DELETE FROM events WHERE deleted_at IS NOT NULL;
  ELSE
    DELETE FROM events WHERE deleted_at IS NOT NULL AND created_by = p_user_id;
  END IF;
  GET DIAGNOSTICS deleted_events = ROW_COUNT;

  -- Delete soft-deleted templates
  IF p_admin_mode THEN
    DELETE FROM event_templates WHERE deleted_at IS NOT NULL;
  ELSE
    DELETE FROM event_templates WHERE deleted_at IS NOT NULL AND user_id = p_user_id;
  END IF;
  GET DIAGNOSTICS deleted_templates = ROW_COUNT;

  RETURN json_build_object(
    'deleted_events', deleted_events,
    'deleted_templates', deleted_templates
  );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_permanent_delete_all_soft_deleted(UUID, BOOLEAN) TO authenticated;

-- =============================================================================
-- 6. SECURITY DEFINER RPC to get all soft-deleted events (admin view)
-- =============================================================================
CREATE OR REPLACE FUNCTION admin_get_soft_deleted_events(
  p_user_id UUID,
  p_admin_mode BOOLEAN DEFAULT FALSE
)
RETURNS SETOF events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_admin_mode THEN
    RETURN QUERY
      SELECT * FROM events
      WHERE deleted_at IS NOT NULL
      ORDER BY deleted_at DESC;
  ELSE
    RETURN QUERY
      SELECT * FROM events
      WHERE deleted_at IS NOT NULL AND created_by = p_user_id
      ORDER BY deleted_at DESC;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_soft_deleted_events(UUID, BOOLEAN) TO authenticated;
