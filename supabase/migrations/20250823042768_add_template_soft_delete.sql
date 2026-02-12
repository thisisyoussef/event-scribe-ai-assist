-- Add soft delete functionality for event templates
-- This allows templates to be recovered from recently deleted

-- Add soft delete fields to event_templates table
ALTER TABLE event_templates 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

-- Create index for efficient soft delete queries
CREATE INDEX IF NOT EXISTS idx_event_templates_deleted_at ON event_templates(deleted_at);

-- Update the delete policy to allow soft deletes
DROP POLICY IF EXISTS "Users can delete their own templates" ON event_templates;
CREATE POLICY "Users can soft delete their own templates" ON event_templates
  FOR UPDATE USING (
    user_id = auth.uid() AND deleted_at IS NULL
  );

-- Add policy for soft delete (update deleted_at)
CREATE POLICY "Users can soft delete templates they own" ON event_templates
  FOR UPDATE USING (
    user_id = auth.uid()
  );

-- Function to soft delete a template
CREATE OR REPLACE FUNCTION soft_delete_event_template(template_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if template exists and user owns it
  IF NOT EXISTS (
    SELECT 1 FROM event_templates 
    WHERE id = template_id AND user_id = user_id
  ) THEN
    RETURN FALSE;
  END IF;

  -- Soft delete the template
  UPDATE event_templates 
  SET deleted_at = NOW(), deleted_by = user_id
  WHERE id = template_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to restore a soft deleted template
CREATE OR REPLACE FUNCTION restore_event_template(template_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if template exists and user owns it
  IF NOT EXISTS (
    SELECT 1 FROM event_templates 
    WHERE id = template_id AND user_id = user_id
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

-- Function to permanently delete old soft deleted templates (older than 30 days)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the select policy to exclude soft deleted templates by default
DROP POLICY IF EXISTS "Users can view their own templates and public templates" ON event_templates;
CREATE POLICY "Users can view their own templates and public templates" ON event_templates
  FOR SELECT USING (
    deleted_at IS NULL AND (
      user_id = auth.uid() OR is_public = true
    )
  );

-- Add policy to view soft deleted templates (for recovery purposes)
CREATE POLICY "Users can view their own soft deleted templates" ON event_templates
  FOR SELECT USING (
    deleted_at IS NOT NULL AND user_id = auth.uid()
  );

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION soft_delete_event_template(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_event_template(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_deleted_templates() TO authenticated;
