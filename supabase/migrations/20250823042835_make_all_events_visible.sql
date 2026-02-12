-- Make all events visible to all authenticated users
-- Also allow viewing related volunteer roles and volunteers for any non-deleted event

-- Ensure RLS is enabled (should already be enabled by previous migrations)
ALTER TABLE IF EXISTS events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS volunteer_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS volunteers ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to select all non-deleted events
-- Note: We intentionally include drafts; only exclude soft-deleted events
DROP POLICY IF EXISTS "authenticated_can_select_all_active_events" ON events;
CREATE POLICY "authenticated_can_select_all_active_events" ON events
  FOR SELECT
  USING (
    auth.role() = 'authenticated' AND deleted_at IS NULL
  );

-- Allow authenticated users to view volunteer roles for any non-deleted event
DROP POLICY IF EXISTS "authenticated_can_select_roles_for_any_event" ON volunteer_roles;
CREATE POLICY "authenticated_can_select_roles_for_any_event" ON volunteer_roles
  FOR SELECT
  USING (
    auth.role() = 'authenticated' AND EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_id AND e.deleted_at IS NULL
    )
  );

-- Allow authenticated users to view volunteers for any non-deleted event
DROP POLICY IF EXISTS "authenticated_can_select_volunteers_for_any_event" ON volunteers;
CREATE POLICY "authenticated_can_select_volunteers_for_any_event" ON volunteers
  FOR SELECT
  USING (
    auth.role() = 'authenticated' AND EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_id AND e.deleted_at IS NULL
    )
  );

-- Keep existing ownership-based INSERT/UPDATE/DELETE policies intact


