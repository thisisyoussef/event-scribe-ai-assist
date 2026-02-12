-- Fix function search path security vulnerability
-- This migration addresses the security issue where functions have mutable search_path

-- Drop and recreate the soft_delete_event_template function with fixed search_path
DROP FUNCTION IF EXISTS soft_delete_event_template(UUID, UUID);
CREATE OR REPLACE FUNCTION soft_delete_event_template(template_id UUID, user_uuid UUID)
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop and recreate the restore_event_template function with fixed search_path
DROP FUNCTION IF EXISTS restore_event_template(UUID, UUID);
CREATE OR REPLACE FUNCTION restore_event_template(template_id UUID, user_uuid UUID)
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop and recreate the cleanup_old_deleted_templates function with fixed search_path
DROP FUNCTION IF EXISTS cleanup_old_deleted_templates();
CREATE OR REPLACE FUNCTION cleanup_old_deleted_templates()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Count templates to be deleted
  SELECT COUNT(*) INTO deleted_count
  FROM event_templates 
  WHERE deleted_at IS NOT NULL
  AND deleted_at < NOW() - INTERVAL '30 days';

  -- Permanently delete old soft deleted templates
  DELETE FROM event_templates 
  WHERE deleted_at IS NOT NULL
  AND deleted_at < NOW() - INTERVAL '30 days';

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION soft_delete_event_template(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_event_template(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_deleted_templates() TO authenticated;
