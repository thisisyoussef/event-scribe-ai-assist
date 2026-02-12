-- Fix soft_delete_event function to allow admins to delete any event
-- This ensures admin users can delete events regardless of ownership

-- Drop the existing function
DROP FUNCTION IF EXISTS soft_delete_event(UUID, UUID);

-- Recreate the function with admin support
CREATE OR REPLACE FUNCTION soft_delete_event(event_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user owns the event OR is an admin
  IF NOT EXISTS (
    SELECT 1 FROM events 
    WHERE id = event_id 
    AND (
      created_by = user_id OR 
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = user_id AND profiles.is_admin = TRUE
      )
    )
  ) THEN
    RETURN FALSE;
  END IF;
  
  -- Soft delete the event
  UPDATE events 
  SET deleted_at = NOW(), deleted_by = user_id
  WHERE id = event_id;
  
  RETURN TRUE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION soft_delete_event(UUID, UUID) TO authenticated;

-- Also fix the restore_event function to allow admins to restore any event
DROP FUNCTION IF EXISTS restore_event(UUID, UUID);

CREATE OR REPLACE FUNCTION restore_event(event_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user owns the event OR is an admin
  IF NOT EXISTS (
    SELECT 1 FROM events 
    WHERE id = event_id 
    AND (
      created_by = user_id OR 
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = user_id AND profiles.is_admin = TRUE
      )
    )
  ) THEN
    RETURN FALSE;
  END IF;
  
  -- Restore the event
  UPDATE events 
  SET deleted_at = NULL, deleted_by = NULL
  WHERE id = event_id;
  
  RETURN TRUE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION restore_event(UUID, UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION soft_delete_event(UUID, UUID) IS 'Function to soft delete an event - allows owners and admins to delete any event';
COMMENT ON FUNCTION restore_event(UUID, UUID) IS 'Function to restore a soft deleted event - allows owners and admins to restore any event';
