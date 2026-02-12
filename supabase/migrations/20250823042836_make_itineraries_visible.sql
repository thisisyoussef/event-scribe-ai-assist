-- Allow authenticated users to view itineraries for any non-deleted event

ALTER TABLE IF EXISTS itineraries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_can_select_itineraries_for_any_event" ON itineraries;
CREATE POLICY "authenticated_can_select_itineraries_for_any_event" ON itineraries
  FOR SELECT
  USING (
    auth.role() = 'authenticated' AND EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_id AND e.deleted_at IS NULL
    )
  );


