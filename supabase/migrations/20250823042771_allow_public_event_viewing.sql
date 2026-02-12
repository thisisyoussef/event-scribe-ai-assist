-- Allow public viewing of published events for volunteer signup
-- This enables anyone with the volunteer link to view event details without authentication

-- Policy for events: allow public viewing of published events
DROP POLICY IF EXISTS "Public can view published events for volunteer signup" ON events;
CREATE POLICY "Public can view published events for volunteer signup" ON events
  FOR SELECT USING (
    status = 'published'
  );

-- Policy for volunteer_roles: allow public viewing of roles for published events
DROP POLICY IF EXISTS "Public can view volunteer roles for published events" ON volunteer_roles;
CREATE POLICY "Public can view volunteer roles for published events" ON volunteer_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE id = event_id AND status = 'published'
    )
  );

-- Policy for volunteers: allow public viewing of volunteers for published events
DROP POLICY IF EXISTS "Public can view volunteers for published events" ON volunteers;
CREATE POLICY "Public can view volunteers for published events" ON volunteers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE id = event_id AND status = 'published'
    )
  );

-- Policy for contacts: allow public viewing of POC contacts for published events
-- This is needed for the volunteer signup page to display coordinator information
DROP POLICY IF EXISTS "Public can view POC contacts for published events" ON contacts;
CREATE POLICY "Public can view POC contacts for published events" ON contacts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM volunteer_roles vr
      JOIN events e ON vr.event_id = e.id
      WHERE e.status = 'published' 
      AND vr.suggested_poc IS NOT NULL 
      AND vr.suggested_poc @> ARRAY[contacts.id::text]
    )
  );
