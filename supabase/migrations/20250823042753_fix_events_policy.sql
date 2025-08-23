-- Fix events policy for shared access
-- The update policy was incorrectly checking shared_by instead of shared_with

DROP POLICY IF EXISTS "Users can update events they own or have edit access to" ON events;
CREATE POLICY "Users can update events they own or have edit access to" ON events
  FOR UPDATE USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM event_shares 
      WHERE event_id = id AND shared_with = auth.uid() AND permission_level = 'edit'
    )
  );
