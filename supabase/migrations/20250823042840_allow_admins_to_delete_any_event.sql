-- Allow admins to delete any event
-- This gives admin users higher privileges for event management

-- Drop existing delete policies on events table
DROP POLICY IF EXISTS "Users can delete own events" ON events;
DROP POLICY IF EXISTS "Users can delete events" ON events;

-- Create new delete policy that allows admins to delete any event
CREATE POLICY "Users can delete own events or admins can delete any event" ON events
  FOR DELETE USING (
    auth.uid() = created_by OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
    )
  );

-- Also update the soft delete policy for deleted_at field
DROP POLICY IF EXISTS "Users can soft delete own events" ON events;

CREATE POLICY "Users can soft delete own events or admins can soft delete any event" ON events
  FOR UPDATE USING (
    auth.uid() = created_by OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
    )
  );

-- Add comment
COMMENT ON POLICY "Users can delete own events or admins can delete any event" ON events IS 'Policy allowing users to delete their own events or admins to delete any event';
COMMENT ON POLICY "Users can soft delete own events or admins can soft delete any event" ON events IS 'Policy allowing users to soft delete their own events or admins to soft delete any event';
