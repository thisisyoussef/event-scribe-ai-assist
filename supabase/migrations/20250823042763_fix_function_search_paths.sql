-- Fix mutable search_path security issue for functions
-- This ensures functions have explicit, immutable search paths

-- Fix soft_delete_event function
CREATE OR REPLACE FUNCTION soft_delete_event(event_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Fix restore_event function
CREATE OR REPLACE FUNCTION restore_event(event_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Fix cleanup_old_deleted_events function
CREATE OR REPLACE FUNCTION cleanup_old_deleted_events()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
