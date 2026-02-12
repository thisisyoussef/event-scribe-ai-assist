-- Allow authenticated users to edit events, itineraries, and volunteer roles for any non-deleted event

-- Ensure RLS is enabled
ALTER TABLE IF EXISTS events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS volunteer_roles ENABLE ROW LEVEL SECURITY;

-- Permit authenticated users to UPDATE non-deleted events (ownership unchanged in app code)
DROP POLICY IF EXISTS "authenticated_can_update_any_active_event" ON events;
CREATE POLICY "authenticated_can_update_any_active_event" ON events
  FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND deleted_at IS NULL
  )
  WITH CHECK (
    auth.role() = 'authenticated' AND deleted_at IS NULL
  );

-- Permit authenticated users to INSERT and UPDATE itineraries for any non-deleted event
DROP POLICY IF EXISTS "authenticated_can_insert_itineraries_for_any_event" ON itineraries;
CREATE POLICY "authenticated_can_insert_itineraries_for_any_event" ON itineraries
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND EXISTS (
      SELECT 1 FROM events e WHERE e.id = event_id AND e.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "authenticated_can_update_itineraries_for_any_event" ON itineraries;
CREATE POLICY "authenticated_can_update_itineraries_for_any_event" ON itineraries
  FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND EXISTS (
      SELECT 1 FROM events e WHERE e.id = event_id AND e.deleted_at IS NULL
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated' AND EXISTS (
      SELECT 1 FROM events e WHERE e.id = event_id AND e.deleted_at IS NULL
    )
  );

-- Permit authenticated users to INSERT/UPDATE/DELETE volunteer roles for any non-deleted event
DROP POLICY IF EXISTS "authenticated_can_insert_roles_for_any_event" ON volunteer_roles;
CREATE POLICY "authenticated_can_insert_roles_for_any_event" ON volunteer_roles
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND EXISTS (
      SELECT 1 FROM events e WHERE e.id = event_id AND e.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "authenticated_can_update_roles_for_any_event" ON volunteer_roles;
CREATE POLICY "authenticated_can_update_roles_for_any_event" ON volunteer_roles
  FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND EXISTS (
      SELECT 1 FROM events e WHERE e.id = event_id AND e.deleted_at IS NULL
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated' AND EXISTS (
      SELECT 1 FROM events e WHERE e.id = event_id AND e.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "authenticated_can_delete_roles_for_any_event" ON volunteer_roles;
CREATE POLICY "authenticated_can_delete_roles_for_any_event" ON volunteer_roles
  FOR DELETE
  USING (
    auth.role() = 'authenticated' AND EXISTS (
      SELECT 1 FROM events e WHERE e.id = event_id AND e.deleted_at IS NULL
    )
  );


