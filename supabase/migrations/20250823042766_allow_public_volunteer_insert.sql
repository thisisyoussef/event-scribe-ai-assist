-- Allow public volunteer signups for published events
-- Permits INSERTs by unauthenticated users when the event is published
DROP POLICY IF EXISTS "Public can insert volunteers for published events" ON volunteers;

CREATE POLICY "Public can insert volunteers for published events" ON volunteers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE id = event_id AND status = 'published'
    )
  );
