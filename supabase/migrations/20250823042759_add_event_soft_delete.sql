-- Add soft delete functionality for events
-- This allows events to be "deleted" but recoverable for 30 days

-- Add soft delete fields to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

-- Create index for efficient soft delete queries
CREATE INDEX IF NOT EXISTS idx_events_deleted_at ON events(deleted_at);

-- Update the delete policy to allow soft deletes
DROP POLICY IF EXISTS "Users can delete events they own" ON events;
CREATE POLICY "Users can delete events they own" ON events
  FOR UPDATE USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM event_shares 
      WHERE event_id = id AND shared_with = auth.uid() AND permission_level = 'edit'
    )
  );

-- Add policy for soft delete (update deleted_at)
CREATE POLICY "Users can soft delete events they own" ON events
  FOR UPDATE USING (
    created_by = auth.uid()
  );

-- Function to soft delete an event
CREATE OR REPLACE FUNCTION soft_delete_event(event_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user owns the event
  IF NOT EXISTS (SELECT 1 FROM events WHERE id = event_id AND created_by = user_id) THEN
    RETURN FALSE;
  END IF;
  
  -- Soft delete the event
  UPDATE events 
  SET deleted_at = NOW(), deleted_by = user_id
  WHERE id = event_id;
  
  RETURN TRUE;
END;
$$;

-- Function to restore a soft deleted event
CREATE OR REPLACE FUNCTION restore_event(event_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user owns the event
  IF NOT EXISTS (SELECT 1 FROM events WHERE id = event_id AND created_by = user_id) THEN
    RETURN FALSE;
  END IF;
  
  -- Restore the event
  UPDATE events 
  SET deleted_at = NULL, deleted_by = NULL
  WHERE id = event_id;
  
  RETURN TRUE;
END;
$$;

-- Function to permanently delete old soft deleted events (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_deleted_events()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Count events to be deleted
  SELECT COUNT(*) INTO deleted_count
  FROM events 
  WHERE deleted_at IS NOT NULL 
  AND deleted_at < NOW() - INTERVAL '30 days';
  
  -- Permanently delete old soft deleted events
  DELETE FROM events 
  WHERE deleted_at IS NOT NULL 
  AND deleted_at < NOW() - INTERVAL '30 days';
  
  RETURN deleted_count;
END;
$$;

-- Update the select policy to exclude soft deleted events by default
DROP POLICY IF EXISTS "Users can view events they own or have access to" ON events;
CREATE POLICY "Users can view events they own or have access to" ON events
  FOR SELECT USING (
    deleted_at IS NULL AND (
      created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM event_shares 
        WHERE event_id = id AND shared_with = auth.uid()
      )
    )
  );

-- Add policy to view soft deleted events (for recovery purposes)
CREATE POLICY "Users can view their own soft deleted events" ON events
  FOR SELECT USING (
    deleted_at IS NOT NULL AND created_by = auth.uid()
  );
