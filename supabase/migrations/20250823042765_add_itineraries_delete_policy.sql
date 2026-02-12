-- RLS DELETE policy for itineraries so app can cleanly replace rows on save
DROP POLICY IF EXISTS "Users can delete itineraries for events they own or have edit access to" ON itineraries;

CREATE POLICY "Users can delete itineraries for events they own or have edit access to" ON itineraries
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE id = event_id AND created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM event_shares 
      WHERE event_id = itineraries.event_id AND shared_with = auth.uid() AND permission_level = 'edit'
    )
  );
