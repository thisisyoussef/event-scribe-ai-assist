-- Comprehensive fix for template policies and permissions
-- This migration ensures all template operations work correctly

-- First, let's check if there are any existing policies that might conflict
-- and drop them all to start fresh

-- Drop ALL existing policies on event_templates
DROP POLICY IF EXISTS "Users can view their own templates and public templates" ON event_templates;
DROP POLICY IF EXISTS "Users can create their own templates" ON event_templates;
DROP POLICY IF EXISTS "Users can update their own templates" ON event_templates;
DROP POLICY IF EXISTS "Users can delete their own templates" ON event_templates;
DROP POLICY IF EXISTS "Users can soft delete their own templates" ON event_templates;
DROP POLICY IF EXISTS "Users can soft delete templates they own" ON event_templates;
DROP POLICY IF EXISTS "Users can view their own soft deleted templates" ON event_templates;

-- Now recreate all policies with the correct logic

-- 1. SELECT policy - users can view their own templates and public templates (excluding soft deleted)
CREATE POLICY "Users can view their own templates and public templates" ON event_templates
  FOR SELECT USING (
    deleted_at IS NULL AND (
      user_id = auth.uid() OR is_public = true
    )
  );

-- 2. SELECT policy - users can view their own soft deleted templates (for recovery)
CREATE POLICY "Users can view their own soft deleted templates" ON event_templates
  FOR SELECT USING (
    deleted_at IS NOT NULL AND user_id = auth.uid()
  );

-- 3. INSERT policy - users can create their own templates
CREATE POLICY "Users can create their own templates" ON event_templates
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- 4. UPDATE policy - users can update their own templates (this is the key one)
CREATE POLICY "Users can update their own templates" ON event_templates
  FOR UPDATE USING (user_id = auth.uid());

-- 5. DELETE policy - users can delete their own templates
CREATE POLICY "Users can delete their own templates" ON event_templates
  FOR DELETE USING (user_id = auth.uid());

-- Now let's ensure the functions are working correctly
-- Drop and recreate the functions to ensure they have the right permissions

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION soft_delete_event_template(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_event_template(UUID, UUID) TO authenticated;

-- Ensure the deleted_at and deleted_by columns exist
ALTER TABLE event_templates 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

-- Create index for efficient soft delete queries if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_event_templates_deleted_at ON event_templates(deleted_at);

-- Let's also check if there are any triggers that might be interfering
-- Drop any problematic triggers and recreate them if needed
DROP TRIGGER IF EXISTS update_event_templates_updated_at ON event_templates;

-- Recreate the updated_at trigger
CREATE TRIGGER update_event_templates_updated_at
  BEFORE UPDATE ON event_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
