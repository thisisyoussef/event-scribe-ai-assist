-- Fix ambiguous column reference in template functions
-- The issue is that both function parameter and table column are named 'user_id'

-- Drop existing functions first
DROP FUNCTION IF EXISTS soft_delete_event_template(UUID, UUID);
DROP FUNCTION IF EXISTS restore_event_template(UUID, UUID);

-- Recreate soft_delete_event_template function with fixed parameter name
CREATE FUNCTION soft_delete_event_template(template_id UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if template exists and user owns it
  IF NOT EXISTS (
    SELECT 1 FROM event_templates 
    WHERE id = template_id AND user_id = user_uuid
  ) THEN
    RETURN FALSE;
  END IF;

  -- Soft delete the template
  UPDATE event_templates 
  SET deleted_at = NOW(), deleted_by = user_uuid
  WHERE id = template_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate restore_event_template function with fixed parameter name
CREATE FUNCTION restore_event_template(template_id UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if template exists and user owns it
  IF NOT EXISTS (
    SELECT 1 FROM event_templates 
    WHERE id = template_id AND user_id = user_uuid
  ) THEN
    RETURN FALSE;
  END IF;

  -- Restore the template
  UPDATE event_templates 
  SET deleted_at = NULL, deleted_by = NULL
  WHERE id = template_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on updated functions
GRANT EXECUTE ON FUNCTION soft_delete_event_template(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_event_template(UUID, UUID) TO authenticated;
