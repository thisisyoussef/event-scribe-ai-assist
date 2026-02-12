-- Fix mutable search_path for soft_delete_event
-- Recreate with explicit SET search_path = public

-- Drop existing function with matching signature
DROP FUNCTION IF EXISTS soft_delete_event(UUID, UUID);

-- Recreate function with fixed search_path
CREATE OR REPLACE FUNCTION soft_delete_event(event_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user owns the event OR is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.events 
    WHERE id = event_id 
    AND (
      created_by = user_id OR 
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = user_id AND profiles.is_admin = TRUE
      )
    )
  ) THEN
    RETURN FALSE;
  END IF;
  
  -- Soft delete the event
  UPDATE public.events 
  SET deleted_at = NOW(), deleted_by = user_id
  WHERE id = event_id;
  
  RETURN TRUE;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION soft_delete_event(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION soft_delete_event(UUID, UUID) IS 'Soft delete event with fixed search_path (public).';


