-- Final fix for template functions to ensure correct parameter names
-- This migration ensures the functions are properly created with user_uuid parameter

-- Drop existing functions first to avoid conflicts
DROP FUNCTION IF EXISTS soft_delete_event_template(UUID, UUID);
DROP FUNCTION IF EXISTS restore_event_template(UUID, UUID);

-- Recreate soft_delete_event_template function with correct parameter name
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
  -- Use SET SESSION to temporarily disable RLS for this operation
  SET LOCAL row_security = off;
  
  UPDATE event_templates 
  SET deleted_at = NOW(), deleted_by = user_uuid
  WHERE id = template_id;
  
  -- Re-enable RLS
  SET LOCAL row_security = on;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate restore_event_template function with correct parameter name
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
  -- Use SET SESSION to temporarily disable RLS for this operation
  SET LOCAL row_security = off;
  
  UPDATE event_templates 
  SET deleted_at = NULL, deleted_by = NULL
  WHERE id = template_id;
  
  -- Re-enable RLS
  SET LOCAL row_security = on;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the deleted_at and deleted_by columns exist
ALTER TABLE event_templates 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

-- Create index for efficient soft delete queries if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_event_templates_deleted_at ON event_templates(deleted_at);

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION soft_delete_event_template(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_event_template(UUID, UUID) TO authenticated;

-- Ensure proper policies are in place
DROP POLICY IF EXISTS "Users can soft delete templates they own" ON event_templates;
CREATE POLICY "Users can soft delete templates they own" ON event_templates
  FOR UPDATE USING (
    user_id = auth.uid()
  );

-- Add policy to view soft deleted templates (for recovery purposes)
DROP POLICY IF EXISTS "Users can view their own soft deleted templates" ON event_templates;
CREATE POLICY "Users can view their own soft deleted templates" ON event_templates
  FOR SELECT USING (
    deleted_at IS NOT NULL AND user_id = auth.uid()
  );
