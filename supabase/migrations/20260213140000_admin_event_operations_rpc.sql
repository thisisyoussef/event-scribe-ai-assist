-- SECURITY DEFINER RPC functions for event admin operations.
-- These bypass RLS because they run as the function owner (postgres),
-- which is necessary because the Lovable proxy intercepts fetch requests
-- and overrides the Authorization header, preventing service_role usage.

-- 1. Update event status (draft/published)
CREATE OR REPLACE FUNCTION admin_update_event_status(
  p_event_id UUID,
  p_status TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  IF p_status NOT IN ('draft', 'published') THEN
    RAISE EXCEPTION 'Invalid status: %', p_status;
  END IF;

  UPDATE events
  SET status = p_status, updated_at = NOW()
  WHERE id = p_event_id
  RETURNING json_build_object('id', id, 'status', status, 'is_public', is_public) INTO result;

  IF result IS NULL THEN
    RAISE EXCEPTION 'Event not found: %', p_event_id;
  END IF;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_update_event_status(UUID, TEXT) TO authenticated;

-- 2. Update event visibility (public/private)
CREATE OR REPLACE FUNCTION admin_update_event_visibility(
  p_event_id UUID,
  p_is_public BOOLEAN
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  UPDATE events
  SET is_public = p_is_public, updated_at = NOW()
  WHERE id = p_event_id
  RETURNING json_build_object('id', id, 'status', status, 'is_public', is_public) INTO result;

  IF result IS NULL THEN
    RAISE EXCEPTION 'Event not found: %', p_event_id;
  END IF;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_update_event_visibility(UUID, BOOLEAN) TO authenticated;

-- 3. Soft delete event (set deleted_at)
DROP FUNCTION IF EXISTS soft_delete_event(UUID, UUID);

CREATE OR REPLACE FUNCTION soft_delete_event(
  event_id UUID,
  user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE events
  SET deleted_at = NOW(), deleted_by = user_id
  WHERE id = event_id AND deleted_at IS NULL;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION soft_delete_event(UUID, UUID) TO authenticated;

-- 4. Restore event (clear deleted_at)
DROP FUNCTION IF EXISTS restore_event(UUID, UUID);

CREATE OR REPLACE FUNCTION restore_event(
  event_id UUID,
  user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE events
  SET deleted_at = NULL, deleted_by = NULL
  WHERE id = event_id AND deleted_at IS NOT NULL;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION restore_event(UUID, UUID) TO authenticated;
